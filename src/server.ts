import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { pool } from './config/database.js';

const port = Number(process.env.PORT ?? 3000);

try {
  await pool.query('SELECT 1');
  serve({ fetch: createApp().fetch, port }, (info) => {
    console.log(`API disponível em http://localhost:${info.port}`);
  });
} catch (error) {
  console.error('Não foi possível iniciar a API:', error);
  process.exit(1);
}
