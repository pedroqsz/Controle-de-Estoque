import { NextResponse } from "next/server";

export function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export function ehInteiro(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

export async function lerCorpo(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const corpo = await req.json();
    if (typeof corpo === "object" && corpo !== null && !Array.isArray(corpo)) {
      return corpo as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function lerId(texto: string): number | null {
  const id = Number(texto);
  return Number.isInteger(id) && id > 0 ? id : null;
}
