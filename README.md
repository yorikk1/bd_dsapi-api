# API REST para loja online — `bd_dsapi`

API desenvolvida em TypeScript com Node.js, Hono.js e MySQL. O projeto permite cadastrar clientes, consultar produtos disponíveis, criar e consultar pedidos, além de oferecer operações administrativas para produtos e pedidos.

## Tecnologias

- Node.js 20+
- TypeScript
- Hono.js e `@hono/node-server`
- MySQL 8+
- mysql2 com consultas parametrizadas e transações
- Zod para validação
- Middlewares nativos do Hono para CORS, cabeçalhos seguros e logs
- Node Test Runner com requisições nativas ao `app.fetch`

## Como executar

1. Crie a estrutura do banco:

   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

2. Configure a aplicação:

   ```bash
   cp .env.example .env
   npm install
   ```

3. Altere no `.env` as credenciais do MySQL e defina uma chave administrativa segura.

4. Inicie a API:

   ```bash
   npm run dev
   ```

A API estará disponível em `http://localhost:3000`. O nome padrão do banco é obrigatoriamente `bd_dsapi`.

## Endpoints públicos

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/saude` | Verifica a disponibilidade da API |
| GET | `/api/cidades` | Lista cidades |
| GET | `/api/categorias` | Lista categorias |
| POST | `/api/clientes` | Cadastra um cliente |
| GET | `/api/produtos` | Lista somente produtos com estoque |
| GET | `/api/produtos?categoria_id=1` | Filtra produtos por categoria |
| POST | `/api/pedidos` | Cria um pedido e desconta o estoque |
| GET | `/api/clientes/:clienteId/pedidos` | Lista os pedidos de um cliente |

### Cadastro de cliente

```json
{
  "nome": "Maria Silva",
  "altura": 1.65,
  "nascimento": "1995-04-20",
  "cidade_id": 1
}
```

### Criação de pedido

```json
{
  "cliente_id": 1,
  "endereco": "Rua das Flores, 10",
  "itens": [
    { "produto_id": 1, "quantidade": 2 },
    { "produto_id": 2, "quantidade": 1 }
  ]
}
```

A criação ocorre dentro de uma transação: o estoque é bloqueado, verificado e atualizado junto com o pedido. Se qualquer item falhar, todas as mudanças são desfeitas.

## Endpoints administrativos

Envie a chave definida em `ADMIN_API_KEY` no cabeçalho `x-admin-key`.

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/admin/produtos` | Lista todos os produtos |
| POST | `/api/admin/produtos` | Cria um produto |
| PUT | `/api/admin/produtos/:id` | Atualiza um produto |
| DELETE | `/api/admin/produtos/:id` | Exclui um produto |
| GET | `/api/admin/pedidos` | Lista todos os pedidos |
| GET | `/api/admin/pedidos/:id` | Exibe pedido e itens |
| PUT | `/api/admin/pedidos/:id` | Atualiza o endereço do pedido |
| DELETE | `/api/admin/pedidos/:id` | Exclui o pedido e devolve os itens ao estoque |

### Criação de produto

```json
{
  "nome": "Mouse sem fio",
  "preco": 89.9,
  "quantidade": 20,
  "categoria_id": 1
}
```

## Respostas e erros

- `201 Created`: cadastro ou pedido criado.
- `204 No Content`: exclusão concluída.
- `401 Unauthorized`: chave administrativa inválida.
- `404 Not Found`: recurso inexistente.
- `409 Conflict`: estoque insuficiente ou integridade referencial.
- `422 Unprocessable Entity`: dados inválidos.
- `500 Internal Server Error`: falha inesperada.

Erros são retornados em JSON:

```json
{
  "erro": "Dados da requisição inválidos.",
  "detalhes": [
    { "campo": "nome", "mensagem": "String must contain at least 1 character(s)" }
  ]
}
```

## Testes

```bash
npm test
```

Os testes verificam a rota de saúde, proteção administrativa, validação dos cadastros e resposta de rotas inexistentes.

Para validar os tipos e gerar a versão compilada:

```bash
npm run typecheck
npm run build
```

## Estrutura do banco

O arquivo `database/schema.sql` cria o banco `bd_dsapi` e as cinco tabelas do diagrama ER: `cidades`, `clientes`, `categorias`, `produtos`, `pedidos` e a associativa `pedidos_produtos`, com chaves estrangeiras, índices e restrições de integridade.
