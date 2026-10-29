import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Conexão criada sob demanda: o build não quebra se DATABASE_URL ainda não existir.
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não definida. Copie .env.example para .env.local.");
  }
  return drizzle(neon(url), { schema });
}
