import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { AppError } from './errors/AppError.js';
import { requireAdmin } from './middlewares/admin.js';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';

export function createApp(): Hono {
  const app = new Hono();

  app.use('*', secureHeaders());
  app.use('*', cors());
  if (process.env.NODE_ENV !== 'test') app.use('*', logger());

  app.get('/api/saude', (context) => context.json({
    status: 'ok',
    banco: process.env.DB_NAME ?? 'bd_dsapi',
  }));

  app.route('/api', publicRoutes);
  app.use('/api/admin/*', requireAdmin);
  app.route('/api/admin', adminRoutes);

  app.notFound((context) => context.json({
    erro: `Rota não encontrada: ${context.req.method} ${context.req.path}`,
  }, 404));

  app.onError((error, context) => {
    if (error instanceof AppError) {
      return context.json({
        erro: error.message,
        ...(error.details ? { detalhes: error.details } : {}),
      }, error.statusCode as 400);
    }

    const databaseError = error as { code?: string };
    if (databaseError.code === 'ER_DUP_ENTRY') {
      return context.json({ erro: 'Já existe um registro com esses dados.' }, 409);
    }
    if (databaseError.code === 'ER_ROW_IS_REFERENCED_2') {
      return context.json({ erro: 'O registro está em uso e não pode ser excluído.' }, 409);
    }

    console.error(error);
    return context.json({ erro: 'Erro interno do servidor.' }, 500);
  });

  return app;
}
