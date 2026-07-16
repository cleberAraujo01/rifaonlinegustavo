import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js guarda as variáveis em .env.local, que o dotenv não lê por padrão
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
