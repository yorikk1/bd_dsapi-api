import { timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { AppError } from '../errors/AppError.js';

function safeEqual(value: string, expected: string): boolean {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const requireAdmin: MiddlewareHandler = async (context, next) => {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) throw new AppError('ADMIN_API_KEY não configurada no servidor.', 503);

  const suppliedKey = context.req.header('x-admin-key') ?? '';
  if (!safeEqual(suppliedKey, configuredKey)) {
    throw new AppError('Credencial de administrador inválida.', 401);
  }

  await next();
};
