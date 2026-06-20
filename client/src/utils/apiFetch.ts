import { useAuthStore } from '../stores/authStore';

/**
 * 带认证的 fetch 封装
 * 自动从 authStore 获取 token，同时通过 cookie 和 Authorization header 发送
 * 解决 HttpOnly cookie 在某些场景下不生效的问题
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init?.headers);
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}
