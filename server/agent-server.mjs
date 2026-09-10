import http from "node:http";
import agentWorker from "../worker/src/index.js";

const PORT = Number(process.env.PORT || 3000);
const MAX_ADAPTER_BODY_BYTES = 70 * 1024;

class FixedWindowLimiter {
  constructor(limit, periodSeconds) {
    this.limit = limit;
    this.periodMs = periodSeconds * 1000;
    this.windows = new Map();
  }

  async limitRequest({ key }) {
    const now = Date.now();
    const current = this.windows.get(key);
    if (!current || current.expiresAt <= now) {
      this.windows.set(key, { count: 1, expiresAt: now + this.periodMs });
      return { success: true };
    }

    current.count += 1;
    return { success: current.count <= this.limit };
  }

  sweep() {
    const now = Date.now();
    for (const [key, value] of this.windows) {
      if (value.expiresAt <= now) this.windows.delete(key);
    }
  }
}

const clientLimiter = new FixedWindowLimiter(20, 60);
const serviceLimiter = new FixedWindowLimiter(120, 60);
const sweepTimer = setInterval(() => {
  clientLimiter.sweep();
  serviceLimiter.sweep();
}, 60_000);
sweepTimer.unref();

const env = {
  ...process.env,
  CLIENT_RATE_LIMITER: { limit: (input) => clientLimiter.limitRequest(input) },
  SERVICE_RATE_LIMITER: { limit: (input) => serviceLimiter.limitRequest(input) },
};

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    request.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_ADAPTER_BODY_BYTES) {
        settled = true;
        reject(new RangeError("payload_too_large"));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (!settled) resolve(chunks.length ? Buffer.concat(chunks) : undefined);
    });
    request.on("error", (error) => {
      if (!settled) reject(error);
    });
  });
}

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return request.socket.remoteAddress || "unknown";
}

async function handle(request, response) {
  try {
    const body = ["GET", "HEAD"].includes(request.method || "GET") ? undefined : await readBody(request);
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
      else if (typeof value === "string") headers.set(name, value);
    }
    headers.set("cf-connecting-ip", clientIp(request));

    const workerRequest = new Request(`http://agent.internal${request.url || "/"}`, {
      method: request.method,
      headers,
      body,
    });
    const workerResponse = await agentWorker.fetch(workerRequest, env);

    response.statusCode = workerResponse.status;
    workerResponse.headers.forEach((value, name) => response.setHeader(name, value));
    if (!workerResponse.body) {
      response.end();
      return;
    }
    response.end(Buffer.from(await workerResponse.arrayBuffer()));
  } catch (error) {
    const tooLarge = error instanceof RangeError && error.message === "payload_too_large";
    if (!response.headersSent) {
      response.writeHead(tooLarge ? 413 : 500, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
    }
    response.end(JSON.stringify({
      error: {
        code: tooLarge ? "payload_too_large" : "proxy_error",
        message: tooLarge ? "请求内容过长，请精简后重试。" : "智能体服务暂时不可用，请稍后重试。",
      },
    }));
  }
}

const server = http.createServer((request, response) => {
  void handle(request, response);
});

server.requestTimeout = 65_000;
server.headersTimeout = 70_000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({ event: "agent_proxy_started", port: PORT }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ event: "agent_proxy_stopping", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
