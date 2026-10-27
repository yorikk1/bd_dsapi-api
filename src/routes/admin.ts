import { Hono } from 'hono';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';
import { AppError } from '../errors/AppError.js';
import { pedidoUpdateSchema, produtoSchema, produtoUpdateSchema } from '../schemas/index.js';
import { parseId, parseJson } from '../utils/request.js';

type EntityRow = RowDataPacket & { id: number };
type OrderItemRow = RowDataPacket & {
  produto_id: number;
  nome: string;
  preco: number;
  quantidade: number;
  subtotal: number;
};

export const adminRoutes = new Hono();

adminRoutes.get('/produtos', async (context) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.nome, p.preco, p.quantidade, p.categoria_id, c.nome AS categoria
       FROM produtos p JOIN categorias c ON c.id = p.categoria_id ORDER BY p.id`,
  );
  return context.json(rows);
});

adminRoutes.post('/produtos', async (context) => {
  const input = await parseJson(context, produtoSchema);
  const [categories] = await pool.execute<EntityRow[]>(
    'SELECT id FROM categorias WHERE id = ?',
    [input.categoria_id],
  );
  if (categories.length === 0) throw new AppError('Categoria não encontrada.', 404);

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO produtos (nome, preco, quantidade, categoria_id) VALUES (?, ?, ?, ?)',
    [input.nome, input.preco, input.quantidade, input.categoria_id],
  );
  return context.json({ id: result.insertId, ...input }, 201);
});

adminRoutes.put('/produtos/:id', async (context) => {
  const id = parseId(context.req.param('id'), 'ID do produto');
  const input = await parseJson(context, produtoUpdateSchema);

  if (input.categoria_id !== undefined) {
    const [categories] = await pool.execute<EntityRow[]>(
      'SELECT id FROM categorias WHERE id = ?',
      [input.categoria_id],
    );
    if (categories.length === 0) throw new AppError('Categoria não encontrada.', 404);
  }

  const fields = Object.keys(input) as Array<keyof typeof input>;
  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  const values = fields.map((field) => input[field] as string | number);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE produtos SET ${assignments} WHERE id = ?`,
    [...values, id],
  );
  if (result.affectedRows === 0) throw new AppError('Produto não encontrado.', 404);
  return context.json({ id, ...input });
});

adminRoutes.delete('/produtos/:id', async (context) => {
  const id = parseId(context.req.param('id'), 'ID do produto');
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM produtos WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new AppError('Produto não encontrado.', 404);
  return context.body(null, 204);
});

adminRoutes.get('/pedidos', async (context) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.horario, p.endereco, p.cliente_id, c.nome AS cliente,
            COALESCE(SUM(pp.preco * pp.quantidade), 0) AS total
       FROM pedidos p
       JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN pedidos_produtos pp ON pp.pedido_id = p.id
      GROUP BY p.id, p.horario, p.endereco, p.cliente_id, c.nome
      ORDER BY p.horario DESC`,
  );
  return context.json(rows);
});

adminRoutes.get('/pedidos/:id', async (context) => {
  const id = parseId(context.req.param('id'), 'ID do pedido');
  const [orders] = await pool.execute<RowDataPacket[]>(
    `SELECT p.id, p.horario, p.endereco, p.cliente_id, c.nome AS cliente
       FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?`,
    [id],
  );
  if (orders.length === 0) throw new AppError('Pedido não encontrado.', 404);

  const [items] = await pool.execute<OrderItemRow[]>(
    `SELECT pp.produto_id, pr.nome, pp.preco, pp.quantidade,
            pp.preco * pp.quantidade AS subtotal
       FROM pedidos_produtos pp JOIN produtos pr ON pr.id = pp.produto_id
      WHERE pp.pedido_id = ?`,
    [id],
  );
  return context.json({
    ...orders[0],
    itens: items,
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
  });
});

adminRoutes.put('/pedidos/:id', async (context) => {
  const id = parseId(context.req.param('id'), 'ID do pedido');
  const input = await parseJson(context, pedidoUpdateSchema);
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE pedidos SET endereco = ? WHERE id = ?',
    [input.endereco, id],
  );
  if (result.affectedRows === 0) throw new AppError('Pedido não encontrado.', 404);
  return context.json({ id, endereco: input.endereco });
});

adminRoutes.delete('/pedidos/:id', async (context) => {
  const id = parseId(context.req.param('id'), 'ID do pedido');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [orders] = await connection.execute<EntityRow[]>(
      'SELECT id FROM pedidos WHERE id = ? FOR UPDATE',
      [id],
    );
    if (orders.length === 0) throw new AppError('Pedido não encontrado.', 404);

    const [items] = await connection.execute<(RowDataPacket & { produto_id: number; quantidade: number })[]>(
      'SELECT produto_id, quantidade FROM pedidos_produtos WHERE pedido_id = ?',
      [id],
    );
    for (const item of items) {
      await connection.execute(
        'UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?',
        [item.quantidade, item.produto_id],
      );
    }
    await connection.execute('DELETE FROM pedidos WHERE id = ?', [id]);
    await connection.commit();
    return context.body(null, 204);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
