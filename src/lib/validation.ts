import { z } from "zod";
import { CAMPAIGN } from "@/lib/config";

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

export const reservationSchema = z.object({
  numbers: z
    .array(z.number().int().min(0).max(CAMPAIGN.totalNumbers - 1))
    .min(1, "Escolha pelo menos 1 número")
    .max(
      CAMPAIGN.maxNumbersPerOrder,
      `Máximo de ${CAMPAIGN.maxNumbersPerOrder} números por reserva`,
    ),
  name: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo")
    .max(100, "Nome muito longo"),
  phone: z
    .string()
    .refine((p) => normalizePhoneBR(p) !== null, "WhatsApp inválido — use DDD + número"),
  /** Honeypot anti-bot: humanos nunca preenchem. */
  website: z.string().max(0, "").optional(),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
