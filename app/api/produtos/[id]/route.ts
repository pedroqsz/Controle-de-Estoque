import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { produtos } from "@/db/schema";
import { erro, lerId } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = lerId((await params).id);
  if (id === null) return erro("ID inválido.");

  try {
    const [apagado] = await getDb().delete(produtos).where(eq(produtos.id, id)).returning();
    if (!apagado) return erro("Produto não encontrado.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return erro("Erro ao apagar o produto.", 500);
  }
}
