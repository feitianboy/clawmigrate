import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CORS 中间件：为 API 响应添加跨域头
 * 在 Vercel 部署中前后端通常同域，但本地开发时 Vite (5173) 和 API (3000) 不同源
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://clawmigrate.xyz',
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  const origin = req.headers.origin as string | undefined;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Admin-Password');
  }
}

/**
 * 处理 OPTIONS 预检请求
 * 返回 true 表示已处理，调用方应直接 return
 */
export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(204).end();
    return true;
  }
  return false;
}
