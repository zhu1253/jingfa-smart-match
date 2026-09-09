const ALLOWED_METHODS = new Set(["GET", "HEAD"]);

function withSecurityHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.delete("server");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");

  const contentType = headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    headers.set("cache-control", "no-store");
  } else if (pathname.startsWith("/assets/")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function textResponse(message, status, extraHeaders = {}) {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    const incomingUrl = new URL(request.url);

    if (incomingUrl.pathname === "/_edge/health") {
      return Response.json(
        { status: "ok", service: "jingfa-jfyxy", requestId },
        { headers: { "cache-control": "no-store" } },
      );
    }

    if (!ALLOWED_METHODS.has(request.method)) {
      return textResponse("请求方法不支持。", 405, { allow: "GET, HEAD" });
    }

    let originBase;
    try {
      originBase = new URL(env.ORIGIN_BASE_URL);
      if (originBase.protocol !== "http:" && originBase.protocol !== "https:") {
        throw new TypeError("unsupported_origin_protocol");
      }
    } catch {
      console.error(JSON.stringify({ event: "invalid_origin_config", requestId }));
      return textResponse("站点服务尚未完成配置。", 503);
    }

    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, originBase);
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.delete("authorization");
    upstreamHeaders.delete("cookie");
    upstreamHeaders.delete("host");

    try {
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers: upstreamHeaders,
        redirect: "manual",
      });

      const location = upstream.headers.get("location");
      if (location) {
        const headers = new Headers(upstream.headers);
        try {
          const redirectUrl = new URL(location, originBase);
          if (redirectUrl.origin === originBase.origin) {
            redirectUrl.protocol = incomingUrl.protocol;
            redirectUrl.host = incomingUrl.host;
            headers.set("location", redirectUrl.toString());
          }
        } catch {
          // Preserve malformed or non-HTTP Location values from the origin.
        }
        return withSecurityHeaders(new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers,
        }), incomingUrl.pathname);
      }

      return withSecurityHeaders(upstream, incomingUrl.pathname);
    } catch (error) {
      console.error(JSON.stringify({
        event: "origin_fetch_failed",
        requestId,
        error: error instanceof Error ? error.name : "UnknownError",
      }));
      return textResponse("站点服务暂时不可用，请稍后重试。", 502);
    }
  },
};
