import { Hono } from 'hono';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';
import { AppError } from '../errors/AppError.js';
import { clienteSchema, pedidoSchema } from '../schemas/index.js';
import { parseId, parseJson } from '../utils/request.js';

type EntityRow = RowDataPacket & { id: number };
type ProductRow = RowDataPacket & { id: number; nome: string; preco: number; quantidade: number };

export const publicRoutes = new Hono();

publicRoutes.get('/cidades', async (context) => {
  const [rows] = await pool.query('SELECT id, nome FROM cidades ORDER BY nome');
  return context.json(rows);
});

publicRoutes.get('/categorias', async (context) => {
  const [rows] = await pool.query('SELECT id, nome FROM categorias ORDER BY nome');
  return context.json(rows);
});

publicRoutes.post('/clientes', async (context) => {
  const input = await parseJson(context, clienteSchema);
  const [cities] = await pool.execute<EntityRow[]>('SELECT id FROM cidades WHERE id = ?', [input.cidade_id]);
  if (cities.length === 0) throw new AppError('Cidade não encontrada.', 404);

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO clientes (nome, altura, nascimento, cidade_id) VALUES (?, ?, ?, ?)',
    [input.nome, input.altura, input.nascimento, input.cidade_id],
  );
  return context.json({ id: result.insertId, ...input }, 201);
});

publicRoutes.get('/produtos', async (context) => {
  const rawCategoryId = context.req.query('categoria_id');
  const parameters: number[] = [];
  let filter = 'WHERE p.quantidade > 0';

  if (rawCategoryId !== undefined) {
    const categoryId = parseId(rawCategoryId, 'categoria_id');
    filter += ' AND p.categoria_id = ?';
    parameters.push(categoryId);
  }

  const [rows] = await pool.execute(
    `SELECT p.id, p.nome, p.preco, p.quantidade,
            c.id AS categoria_id, c.nome AS categoria
       FROM produtos p
       JOIN categorias c ON c.id = p.categoria_id
       ${filter}
      ORDER BY p.nome`,
    parameters,
  );
  return context.json(rows);
});

publicRoutes.post('/pedidos', async (context) => {
  const input = await parseJson(context, pedidoSchema);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [customers] = await connection.execute<EntityRow[]>(
      'SELECT id FROM clientes WHERE id = ?',
      [input.cliente_id],
    );
    if (customers.length === 0) throw new AppError('Cliente não encontrado.', 404);

    const productIds = input.itens.map((item) => item.produto_id);
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await connection.execute<ProductRow[]>(
      `SELECT id, nome, preco, quantidade FROM produtos WHERE id IN (${placeholders}) FOR UPDATE`,
      productIds,
    );
    if (products.length !== productIds.length) {
      throw new AppError('Um ou mais produtos não foram encontrados.', 404);
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    for (const item of input.itens) {
      const product = productsById.get(item.produto_id);
      if (!product || product.quantidade < item.quantidade) {
        throw new AppError(`Estoque insuficiente para o produto "${product?.nome ?? item.produto_id}".`, 409);
      }
    }

    const [order] = await connection.execute<ResultSetHeader>(
      'INSERT INTO pedidos (horario, endereco, cliente_id) VALUES (NOW(), ?, ?)',
      [input.endereco, input.cliente_id],
    );

    for (const item of input.itens) {
      const product = productsById.get(item.produto_id)!;
      await connection.execute(
        'INSERT INTO pedidos_produtos (pedido_id, produto_id, preco, quantidade) VALUES (?, ?, ?, ?)',
        [order.insertId, item.produto_id, product.preco, item.quantidade],
      );
      await connection.execute(
        'UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?',
        [item.quantidade, item.produto_id],
      );
    }

    await connection.commit();
    const total = input.itens.reduce(
      (sum, item) => sum + productsById.get(item.produto_id)!.preco * item.quantidade,
      0,
    );
    return context.json({ id: order.insertId, ...input, total }, 201);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

publicRoutes.get('/clientes/:clienteId/pedidos', async (context) => {
  const clientId = parseId(context.req.param('clienteId'), 'ID do cliente');
  const [customers] = await pool.execute<EntityRow[]>('SELECT id FROM clientes WHERE id = ?', [clientId]);
  if (customers.length === 0) throw new AppError('Cliente não encontrado.', 404);

  const [orders] = await pool.execute(
    `SELECT p.id, p.horario, p.endereco,
            COALESCE(SUM(pp.preco * pp.quantidade), 0) AS total
       FROM pedidos p
       LEFT JOIN pedidos_produtos pp ON pp.pedido_id = p.id
      WHERE p.cliente_id = ?
      GROUP BY p.id, p.horario, p.endereco
      ORDER BY p.horario DESC`,
    [clientId],
  );
  return context.json(orders);
});
