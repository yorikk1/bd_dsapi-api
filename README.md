# API REST para loja online com Hono e TypeScript

API REST de uma loja online desenvolvida em TypeScript. Clientes podem se cadastrar, consultar produtos disponíveis, realizar pedidos e consultar seu histórico. Rotas administrativas permitem gerenciar produtos e pedidos.

O projeto utiliza obrigatoriamente o banco MySQL `bd_dsapi` e segue o diagrama ER proposto na atividade.

## Tecnologias

- Node.js 20+
- TypeScript
- Hono.js com `@hono/node-server`
- MySQL 8+
- mysql2 com consultas parametrizadas e transações
- Zod para validação
- Middlewares nativos do Hono para CORS, cabeçalhos seguros e logs
- Node Test Runner com requisições ao `app.fetch` do Hono

## Estrutura do projeto

```text
bd_dsapi-api/
├── database/
│   ├── schema.sql          # banco, tabelas, relações e índices
│   └── seed.sql            # dados iniciais para testes manuais
├── src/
│   ├── config/             # conexão com o MySQL
│   ├── errors/             # erro de domínio da aplicação
│   ├── middlewares/        # proteção das rotas administrativas
│   ├── routes/             # endpoints públicos e administrativos
│   ├── schemas/            # validações com Zod
│   ├── utils/              # leitura e validação de requisições
│   ├── app.ts              # configuração da aplicação Hono
│   └── server.ts           # inicialização do servidor Node.js
├── test/                   # testes automatizados
├── .env.example
├── package.json
└── tsconfig.json
```

## Como executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie a estrutura e os dados iniciais do banco:

   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

3. Copie `.env.example` para `.env` e ajuste as credenciais do MySQL.

4. Inicie a API em modo de desenvolvimento:

   ```bash
   npm run dev
   ```

A API estará disponível em `http://localhost:3000`.

### Variáveis de ambiente

| Variável | Finalidade | Valor padrão |
|---|---|---|
| `PORT` | Porta HTTP da API | `3000` |
| `DB_HOST` | Servidor MySQL | `localhost` |
| `DB_PORT` | Porta do MySQL | `3306` |
| `DB_USER` | Usuário do MySQL | `root` |
| `DB_PASSWORD` | Senha do MySQL | vazia |
| `DB_NAME` | Nome do banco | `bd_dsapi` |
| `ADMIN_API_KEY` | Chave das rotas administrativas | sem padrão |

Para compilar e executar a versão de produção:

```bash
npm run build
npm start
```

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

Exemplo com cURL:

```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria Silva","altura":1.65,"nascimento":"1995-04-20","cidade_id":1}'
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

```bash
curl http://localhost:3000/api/admin/produtos \
  -H "x-admin-key: sua-chave-administrativa"
```

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
- `503 Service Unavailable`: chave administrativa não configurada no servidor.
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

Os testes chamam diretamente o `app.fetch` do Hono e verificam a rota de saúde, a proteção administrativa, a validação dos cadastros e a resposta para rotas inexistentes.

Para validar os tipos e gerar a versão compilada:

```bash
npm run typecheck
npm run build
```

## Banco de dados

O arquivo `database/schema.sql` cria o banco `bd_dsapi` e as seis tabelas do diagrama ER:

- `cidades`
- `clientes`
- `categorias`
- `produtos`
- `pedidos`
- `pedidos_produtos`

As relações usam chaves estrangeiras, índices e restrições de integridade. A tabela associativa `pedidos_produtos` preserva o preço praticado e a quantidade de cada produto no momento da compra.
