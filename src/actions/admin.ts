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

/**
 * Confirma vários pedidos de uma vez (ação em massa do painel).
 * Cada pedido roda na própria transação: um falhar não desfaz os demais.
 */
export async function confirmarPagamentos(
  orderIds: string[],
): Promise<AdminActionResult> {
  await requireAdmin();
  const failed: string[] = [];
  for (const id of orderIds) {
    const result = await confirmarPagamento(id);
    if (!result.ok) failed.push(id);
  }
  if (failed.length > 0) {
    return {
      ok: false,
      message: `${orderIds.length - failed.length} confirmados; ${failed.length} falharam (talvez já não estivessem reservados).`,
    };
  }
  return { ok: true };
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
