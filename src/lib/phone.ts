/**
 * Utilitários de telefone brasileiro compartilhados entre cliente e servidor.
 * Sem dependências externas — entra no bundle do navegador sem custo.
 */

/**
 * Normaliza um WhatsApp brasileiro para o formato internacional (55 + DDD + número).
 * Aceita com/sem pontuação, com/sem 55. Retorna null se inválido.
 */
export function normalizePhoneBR(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 11) return null;
  return `55${digits}`;
}

/**
 * Máscara progressiva "(11) 91234-5678" aplicada enquanto o usuário digita.
 * Suporta fixo (10 dígitos) e celular (11); descarta o 55 se colado junto.
 */
export function maskPhoneBR(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);

  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;

  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  // Até 8 dígitos o hífen fica após o 4º (fixo); no 9º ele desloca (celular).
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}
