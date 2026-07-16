"use server";

import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { numbers, orders } from "@/db/schema";
import { CAMPAIGN, buildReservationMessage, buildWhatsAppUrl } from "@/lib/config";
import { normalizePhoneBR, reservationSchema } from "@/lib/validation";

export type ReserveResult =
  | {
      ok: true;
      orderId: string;
      numbers: number[];
      totalCents: number;
      pixKey: string;
      whatsappUrl: string;
      expiresAt: string;
    }
  | {
      ok: false;
      error: "VALIDATION" | "RATE_LIMITED" | "NUMBERS_TAKEN" | "INTERNAL";
      message: string;
      takenNumbers?: number[];
    };

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MIN = 10;

class TakenError extends Error {
  constructor(public taken: number[]) {
    super("NUMBERS_TAKEN");
  }
}

export async function reservarNumeros(input: {
  numbers: number[];
  name: string;
  phone: string;
  website?: string;
}): Promise<ReserveResult> {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const nums = [...new Set(parsed.data.numbers)].sort((a, b) => a - b);
  const buyerName = parsed.data.name;
  const buyerPhone = normalizePhoneBR(parsed.data.phone)!;
  const totalCents = nums.length * CAMPAIGN.pricePerNumberCents;

  const h = await headers();
  const clientIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    const db = getDb();

    // Rate limit: máx. N pedidos por IP ou telefone na janela.
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000);
    const ipOrPhone = clientIp
      ? or(eq(orders.clientIp, clientIp), eq(orders.buyerPhone, buyerPhone))
      : eq(orders.buyerPhone, buyerPhone);
    const [rl] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(gt(orders.createdAt, since), ipOrPhone));

    if ((rl?.count ?? 0) >= RATE_LIMIT_MAX) {
      return {
        ok: false,
        error: "RATE_LIMITED",
        message: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
      };
    }

    const reservedUntil = new Date(
      Date.now() + CAMPAIGN.reservationHours * 3600 * 1000,
    );

    const order = await db.transaction(async (tx) => {
      // Faxina lazy: libera números de reservas vencidas antes de capturar.
      await tx.execute(sql`
        UPDATE numbers SET status = 'available', order_id = NULL, updated_at = now()
        WHERE order_id IN (
          SELECT id FROM orders WHERE status = 'reserved' AND reserved_until < now()
        )`);
      await tx.execute(sql`
        UPDATE orders SET status = 'cancelled'
        WHERE status = 'reserved' AND reserved_until < now()`);

      const [o] = await tx
        .insert(orders)
        .values({ buyerName, buyerPhone, totalCents, reservedUntil, clientIp })
        .returning();

      // Captura atômica: só pega números ainda livres. O Postgres serializa
      // escritas na mesma linha — quem chegar depois não afeta a linha e o
      // rowcount denuncia a corrida perdida.
      const captured = await tx
        .update(numbers)
        .set({ status: "reserved", orderId: o.id, updatedAt: sql`now()` })
        .where(and(inArray(numbers.n, nums), eq(numbers.status, "available")))
        .returning({ n: numbers.n });

      if (captured.length !== nums.length) {
        const got = new Set(captured.map((c) => c.n));
        throw new TakenError(nums.filter((n) => !got.has(n)));
      }

      return o;
    });

    revalidatePath("/");

    return {
      ok: true,
      orderId: order.id,
      numbers: nums,
      totalCents,
      pixKey: CAMPAIGN.pixKey,
      whatsappUrl: buildWhatsAppUrl(buildReservationMessage(nums, buyerName)),
      expiresAt: reservedUntil.toISOString(),
    };
  } catch (err) {
    if (err instanceof TakenError) {
      return {
        ok: false,
        error: "NUMBERS_TAKEN",
        message: "Alguém acabou de reservar parte desses números. Escolha outros 🙏",
        takenNumbers: err.taken,
      };
    }
    console.error("[reservar] erro:", err);
    return {
      ok: false,
      error: "INTERNAL",
      message: "Erro inesperado. Tente novamente em instantes.",
    };
  }
}
