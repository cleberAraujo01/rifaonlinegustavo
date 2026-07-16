/**
 * Gera o hash bcrypt da senha do admin para colocar em ADMIN_PASSWORD_HASH.
 * Uso: npm run admin:hash -- "minha-senha-forte"
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error("Uso: npm run admin:hash -- \"senha com no mínimo 8 caracteres\"");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);

console.log("No .env.local (cifrões escapados — o Next.js expande $ em arquivos .env):\n");
console.log(`ADMIN_PASSWORD_HASH="${hash.replaceAll("$", "\\$")}"`);
console.log("\nNo painel da Vercel (valor literal, sem escapar):\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
