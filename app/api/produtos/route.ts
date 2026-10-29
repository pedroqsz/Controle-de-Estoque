import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { produtos, type Produto } from "@/db/schema";
import { ehInteiro, erro, lerCorpo } from "@/lib/http";

export const dynamic = "force-dynamic";

function resumir(lista: Produto[]) {
  return {
    totalProdutos: lista.length,
    itensEmEstoque: lista.reduce((soma, p) => soma + p.quantidade, 0),
    valorTotalCentavos: lista.reduce((soma, p) => soma + p.precoCentavos * p.quantidade, 0),
    abaixoDoMinimo: lista.filter((p) => p.quantidade < p.estoqueMinimo).length,
  };
}

export async function GET() {
  try {
    const lista = await getDb().select().from(produtos).orderBy(asc(produtos.nome));
    return NextResponse.json({ produtos: lista, resumo: resumir(lista) });
  } catch (e) {
    console.error(e);
    return erro("Erro ao consultar o banco de dados.", 500);
  }
}

export async function POST(req: Request) {
  const corpo = await lerCorpo(req);
  if (!corpo) return erro("Corpo inválido: envie um objeto JSON.");

  const { nome, precoCentavos, quantidade = 0, estoqueMinimo = 5 } = corpo;

  if (typeof nome !== "string" || nome.trim().length === 0) {
    return erro("O nome é obrigatório.");
  }
  if (nome.trim().length > 80) {
    return erro("O nome pode ter no máximo 80 caracteres.");
  }
  if (!ehInteiro(precoCentavos) || precoCentavos <= 0) {
    return erro("O preço deve ser um número inteiro de centavos maior que zero.");
  }
  if (!ehInteiro(quantidade) || quantidade < 0) {
    return erro("A quantidade deve ser um inteiro igual ou maior que zero.");
  }
  if (!ehInteiro(estoqueMinimo) || estoqueMinimo < 0) {
    return erro("O estoque mínimo deve ser um inteiro igual ou maior que zero.");
  }

  try {
    const [criado] = await getDb()
      .insert(produtos)
      .values({ nome: nome.trim(), precoCentavos, quantidade, estoqueMinimo })
      .returning();
    return NextResponse.json(criado, { status: 201 });
  } catch (e) {
    console.error(e);
    return erro("Erro ao cadastrar o produto.", 500);
  }
}
