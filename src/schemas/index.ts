import { z } from 'zod';

const positiveId = z.coerce.number().int().positive();
const text = (maximum: number) => z.string().trim().min(1).max(maximum);

export const clienteSchema = z.object({
  nome: text(100),
  altura: z.coerce.number().positive().max(3),
  nascimento: z.coerce.date().transform((date) => date.toISOString().slice(0, 10)),
  cidade_id: positiveId,
}).strict();

export const produtoSchema = z.object({
  nome: text(100),
  preco: z.coerce.number().nonnegative(),
  quantidade: z.coerce.number().nonnegative(),
  categoria_id: positiveId,
}).strict();

export const produtoUpdateSchema = produtoSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Informe ao menos um campo para atualizar.',
);

export const pedidoSchema = z.object({
  cliente_id: positiveId,
  endereco: text(200),
  itens: z.array(z.object({
    produto_id: positiveId,
    quantidade: z.coerce.number().positive(),
  }).strict()).min(1),
}).strict().superRefine((value, context) => {
  const ids = value.itens.map((item) => item.produto_id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['itens'],
      message: 'Não repita produtos no mesmo pedido.',
    });
  }
});

export const pedidoUpdateSchema = z.object({ endereco: text(200) }).strict();

export type PedidoInput = z.infer<typeof pedidoSchema>;
export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;
