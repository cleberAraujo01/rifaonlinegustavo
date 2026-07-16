import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { numbers, orders, type Order } from "./schema";
import { CAMPAIGN } from "@/lib/config";

export type GridState = {
  /** 1 char por número: 'D' disponível, 'R' reservado, 'P' pago. */
  grid: string;
  paidCount: number;
  reservedCount: number;
  raisedCents: number;
};

export const EMPTY_GRID: GridState = {
  grid: "D".repeat(CAMPAIGN.totalNumbers),
  paidCount: 0,
  reservedCount: 0,
  raisedCents: 0,
};

/**
 * Estado efetivo da grade. Expiração é tratada de forma "lazy" na leitura:
 * reserva vencida aparece como disponível sem precisar de cron.
 */
export async function getGridState(): Promise<GridState> {
  const db = getDb();
  const rows = await db
    .select({
      n: numbers.n,
      status: numbers.status,
      orderStatus: orders.status,
      reservedUntil: orders.reservedUntil,
    })
    .from(numbers)
    .leftJoin(orders, eq(numbers.orderId, orders.id));

  const chars = new Array<string>(CAMPAIGN.totalNumbers).fill("D");
  let paidCount = 0;
  let reservedCount = 0;
  const now = Date.now();

  for (const r of rows) {
    if (r.status === "paid") {
      chars[r.n] = "P";
      paidCount++;
    } else if (r.status === "reserved") {
      const active =
        r.orderStatus === "reserved" &&
        r.reservedUntil !== null &&
        r.reservedUntil.getTime() > now;
      if (active) {
        chars[r.n] = "R";
        reservedCount++;
      }
    }
  }

  return {
    grid: chars.join(""),
    paidCount,
    reservedCount,
    raisedCents: paidCount * CAMPAIGN.pricePerNumberCents,
  };
}

/** Versão que nunca lança: sem banco configurado, devolve a grade vazia. */
export async function getGridStateSafe(): Promise<GridState> {
  try {
    return await getGridState();
  } catch (err) {
    console.warn("[grid] fallback sem banco:", (err as Error).message);
    return EMPTY_GRID;
  }
}

export type OrderWithNumbers = { order: Order; numbers: number[] };

export async function getOrderWithNumbers(
  id: string,
): Promise<OrderWithNumbers | null> {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;

  const rows = await db
    .select({ n: numbers.n })
    .from(numbers)
    .where(eq(numbers.orderId, id));

  return { order, numbers: rows.map((r) => r.n).sort((a, b) => a - b) };
}
