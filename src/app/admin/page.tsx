import type { Metadata } from "next";
import { desc, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { numbers, orders, type Order } from "@/db/schema";
import { getGridStateSafe } from "@/db/queries";
import { ensureAdminOrRedirect } from "@/lib/session";
import { logout } from "@/actions/auth";
import { CAMPAIGN, formatBRL } from "@/lib/config";
import { OrdersPanel, type OrderData } from "@/components/admin/OrdersPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel do organizador",
  robots: { index: false },
};

async function loadOrders(): Promise<{
  pending: Array<Order & { nums: number[] }>;
  paid: Array<Order & { nums: number[] }>;
}> {
  try {
    const db = getDb();
    const all = await db
      .select()
      .from(orders)
      .where(inArray(orders.status, ["reserved", "paid"]))
      .orderBy(desc(orders.createdAt));

    const numRows = await db
      .select({ n: numbers.n, orderId: numbers.orderId })
      .from(numbers)
      .where(isNotNull(numbers.orderId));

    const byOrder = new Map<string, number[]>();
    for (const r of numRows) {
      if (!r.orderId) continue;
      const list = byOrder.get(r.orderId) ?? [];
      list.push(r.n);
      byOrder.set(r.orderId, list);
    }

    const now = Date.now();
    const withNums = all.map((o) => ({
      ...o,
      nums: (byOrder.get(o.id) ?? []).sort((a, b) => a - b),
    }));

    return {
      pending: withNums.filter(
        (o) => o.status === "reserved" && o.reservedUntil.getTime() > now,
      ),
      paid: withNums.filter((o) => o.status === "paid"),
    };
  } catch (err) {
    console.warn("[admin] fallback sem banco:", (err as Error).message);
    return { pending: [], paid: [] };
  }
}

export default async function AdminPage() {
  await ensureAdminOrRedirect();

  const [stats, { pending, paid }] = await Promise.all([
    getGridStateSafe(),
    loadOrders(),
  ]);

  // URL canônica de produção: o link-comprovante precisa funcionar no
  // celular do comprador mesmo quando a confirmação é feita do ambiente local.
  const siteUrl = CAMPAIGN.siteUrl;

  const pct = Math.round((stats.raisedCents / CAMPAIGN.goalCents) * 100);
  const freeCount =
    CAMPAIGN.totalNumbers - stats.paidCount - stats.reservedCount;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 pb-10">
      <header className="flex items-center justify-between bg-grass-900 px-4 py-3 text-white">
        <h1 className="text-base font-extrabold">⚽ Painel da rifa</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-grass-100 underline">
            sair
          </button>
        </form>
      </header>

      {/* Dashboard */}
      <section className="px-4 pt-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-grass-100">
          <p className="text-2xl font-extrabold text-grass-800 tabular">
            {formatBRL(stats.raisedCents)}{" "}
            <span className="text-sm font-semibold text-stone-500">
              / {formatBRL(CAMPAIGN.goalCents)} ({pct}%)
            </span>
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-grass-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-grass-600 to-gold-500"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-stone-600">
            ✅ {stats.paidCount} pagos · 🔒 {stats.reservedCount} reservados · ⬜{" "}
            {freeCount} livres
          </p>
        </div>
      </section>

      {/* Busca + fila de pendentes + confirmados recolhidos */}
      <OrdersPanel
        pending={pending.map(toOrderData)}
        paid={paid.map(toOrderData)}
        siteUrl={siteUrl}
      />
    </main>
  );
}

function toOrderData(
  o: Order & { nums: number[] },
): OrderData {
  return {
    orderId: o.id,
    buyerName: o.buyerName,
    buyerPhone: o.buyerPhone,
    numbers: o.nums,
    totalCents: o.totalCents,
    createdAtIso: o.createdAt.toISOString(),
  };
}
