import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Driver WebSocket (não HTTP) porque a reserva exige transação interativa
 * (INSERT + UPDATE condicional + rollback). Inicialização preguiçosa para o
 * build não quebrar quando DATABASE_URL ainda não existe.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não definida. Crie um banco Neon e adicione a URL em .env.local (veja .env.example).",
    );
  }
  return drizzle(new Pool({ connectionString: url }), { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  _db ??= createDb();
  return _db;
}
