import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - bracket filename
import handler from './[...path]';

export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
