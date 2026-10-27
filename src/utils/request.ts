import type { Context } from 'hono';
import { type ZodTypeAny, type infer as ZodInfer } from 'zod';
import { AppError } from '../errors/AppError.js';

export async function parseJson<Schema extends ZodTypeAny>(
  context: Context,
  schema: Schema,
): Promise<ZodInfer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new AppError('O corpo da requisição deve conter JSON válido.', 400);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(
      'Dados da requisição inválidos.',
      422,
      result.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensagem: issue.message,
      })),
    );
  }
  return result.data;
}

export function parseId(value: string, label = 'ID'): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new AppError(`${label} inválido.`, 422);
  return id;
}
