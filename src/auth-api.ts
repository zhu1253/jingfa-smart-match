export type AccountUser = { id: string; username: string; displayName: string; role: string };

export async function accountRequest<T>(route: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${route}`, {
      method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal,
      ...(data === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('网络连接失败，请检查网络后重试。');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = Object.assign(new Error(payload?.error?.message || '账号服务暂时不可用，请稍后重试。'), { status: response.status });
    if (response.status === 401 && route !== 'login') window.dispatchEvent(new Event('auth-expired'));
    throw error;
  }
  return payload as T;
}

export function loginLocation(reason?: string) {
  const params = new URLSearchParams();
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== '/login' && !next.startsWith('/login?')) params.set('next', next);
  if (reason) params.set('reason', reason);
  return `/login${params.size ? `?${params}` : ''}`;
}
