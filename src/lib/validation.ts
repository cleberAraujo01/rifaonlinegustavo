import { z } from "zod";
import { CAMPAIGN } from "@/lib/config";
import { normalizePhoneBR } from "@/lib/phone";

// A normalização mora em lib/phone.ts (sem zod) para o cliente reutilizar
// sem inflar o bundle; aqui só re-exportamos para os consumidores do servidor.
export { normalizePhoneBR };

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
