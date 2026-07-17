/**
 * Popula a tabela `numbers` com todos os números da rifa (000 até o total configurado).
 * Idempotente: pode rodar quantas vezes quiser sem duplicar.
 *
 * Uso: npm run db:seed
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { numbers } from "./schema";
import { CAMPAIGN } from "../lib/config";

// Next.js guarda as variáveis em .env.local, que o dotenv não lê por padrão
config({ path: [".env.local", ".env"] });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida (configure .env.local / .env).");
  }
  const db = drizzle(neon(process.env.DATABASE_URL));

  const rows = Array.from({ length: CAMPAIGN.totalNumbers }, (_, n) => ({ n }));

  // Em lotes para não estourar o limite de parâmetros do driver HTTP
  for (let i = 0; i < rows.length; i += 250) {
    await db
      .insert(numbers)
      .values(rows.slice(i, i + 250))
      .onConflictDoNothing();
  }

  console.log(
    `Seed concluído: números 000–${CAMPAIGN.totalNumbers - 1} criados (ou já existiam).`,
  );
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
