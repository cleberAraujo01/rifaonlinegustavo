"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { numbers, orders } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export type AdminActionResult = { ok: true } | { ok: false; message: string };

/** Confirma o pagamento de um pedido: pedido e números viram 'paid'. */
export async function confirmarPagamento(
  orderId: string,
): Promise<AdminActionResult> {
  await requireAdmin();
  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(orders)
        .set({ status: "paid", paidAt: sql`now()` })
        .where(and(eq(orders.id, orderId), eq(orders.status, "reserved")))
        .returning({ id: orders.id });

      if (updated.length === 0) {
        throw new Error("Pedido não está mais em 'reservado'.");
      }

      await tx
        .update(numbers)
        .set({ status: "paid", updatedAt: sql`now()` })
        .where(eq(numbers.orderId, orderId));
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Cancela um pedido e devolve os números para a grade. */
export async function cancelarPedido(
  orderId: string,
): Promise<AdminActionResult> {
  await requireAdmin();
  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ status: "cancelled" })
        .where(eq(orders.id, orderId));
      await tx
        .update(numbers)
        .set({ status: "available", orderId: null, updatedAt: sql`now()` })
        .where(eq(numbers.orderId, orderId));
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
