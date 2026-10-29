import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { produtos } from "@/db/schema";
import { ehInteiro, erro, lerCorpo, lerId } from "@/lib/http";

export const dynamic = "force-dynamic";

const LIMITE_POR_MOVIMENTO = 1_000_000;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = lerId((await params).id);
  if (id === null) return erro("ID inválido.");

  const corpo = await lerCorpo(req);
  if (!corpo) return erro("Corpo inválido: envie um objeto JSON.");

  const { tipo, quantidade } = corpo;
  if (tipo !== "entrada" && tipo !== "saida") {
    return erro('O tipo deve ser "entrada" ou "saida".');
  }
  if (!ehInteiro(quantidade) || quantidade <= 0) {
    return erro("A quantidade deve ser um inteiro maior que zero.");
  }
  if (quantidade > LIMITE_POR_MOVIMENTO) {
    return erro(`A quantidade por movimentação pode ser no máximo ${LIMITE_POR_MOVIMENTO}.`);
  }

  try {
    const db = getDb();

    // UPDATE atômico: a saída só acontece se houver estoque suficiente,
    // evitando condição de corrida entre duas requisições simultâneas.
    const [atualizado] = await db
      .update(produtos)
      .set({
        quantidade:
          tipo === "entrada"
            ? sql`${produtos.quantidade} + ${quantidade}`
            : sql`${produtos.quantidade} - ${quantidade}`,
      })
      .where(
        tipo === "saida"
          ? and(eq(produtos.id, id), gte(produtos.quantidade, quantidade))
          : eq(produtos.id, id)
      )
      .returning();

    if (atualizado) return NextResponse.json(atualizado);

    const [existe] = await db.select({ id: produtos.id }).from(produtos).where(eq(produtos.id, id));
    if (!existe) return erro("Produto não encontrado.", 404);
    return erro("Estoque insuficiente.");
  } catch (e) {
    console.error(e);
    return erro("Erro ao movimentar o estoque.", 500);
  }
}
