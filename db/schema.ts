import { sql } from "drizzle-orm";
import { check, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const produtos = pgTable(
  "produtos",
  {
    id: serial("id").primaryKey(),
    nome: varchar("nome", { length: 80 }).notNull(),
    // preço em centavos para evitar erros de ponto flutuante
    precoCentavos: integer("preco_centavos").notNull(),
    quantidade: integer("quantidade").notNull().default(0),
    estoqueMinimo: integer("estoque_minimo").notNull().default(5),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => [
    check("preco_maior_que_zero", sql`${t.precoCentavos} > 0`),
    check("quantidade_nao_negativa", sql`${t.quantidade} >= 0`),
  ]
);

export type Produto = typeof produtos.$inferSelect;
