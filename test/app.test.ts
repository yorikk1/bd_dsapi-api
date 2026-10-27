import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'chave-de-teste';

const { createApp } = await import('../src/app.js');
const app = createApp();

test('GET /api/saude informa o nome correto do banco', async () => {
  const response = await app.request('/api/saude');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', banco: 'bd_dsapi' });
});

test('rotas administrativas recusam credencial ausente', async () => {
  const response = await app.request('/api/admin/produtos');
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { erro: 'Credencial de administrador inválida.' });
});

test('POST /api/clientes rejeita payload inválido antes de consultar o banco', async () => {
  const response = await app.request('/api/clientes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome: '' }),
  });
  assert.equal(response.status, 422);
  const body = await response.json() as { erro: string; detalhes: unknown[] };
  assert.equal(body.erro, 'Dados da requisição inválidos.');
  assert.ok(Array.isArray(body.detalhes));
});

test('POST /api/pedidos rejeita produto repetido', async () => {
  const response = await app.request('/api/pedidos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      cliente_id: 1,
      endereco: 'Rua das Flores, 10',
      itens: [
        { produto_id: 1, quantidade: 1 },
        { produto_id: 1, quantidade: 2 },
      ],
    }),
  });
  assert.equal(response.status, 422);
});

test('rota inexistente retorna 404 em JSON', async () => {
  const response = await app.request('/api/inexistente');
  assert.equal(response.status, 404);
  const body = await response.json() as { erro: string };
  assert.match(body.erro, /Rota não encontrada/);
});
