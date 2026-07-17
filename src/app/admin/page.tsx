import type { Metadata } from "next";
import { desc, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { numbers, orders } from "@/db/schema";
import { getGridStateSafe } from "@/db/queries";
import { ensureAdminOrRedirect } from "@/lib/session";
import { logout } from "@/actions/auth";
import { CAMPAIGN, formatBRL } from "@/lib/config";
import { formatPct } from "@/components/landing/StickyHeader";
import { OrdersPanel, type OrderData } from "@/components/admin/OrdersPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel do organizador",
  robots: { index: false },
};

/** Todos os pedidos (todas as situações), já categorizados para o painel. */
async function loadOrders(): Promise<OrderData[]> {
  try {
    const db = getDb();
    const all = await db.select().from(orders).orderBy(desc(orders.createdAt));

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
    return all.map((o) => ({
      orderId: o.id,
      buyerName: o.buyerName,
      buyerPhone: o.buyerPhone,
      numbers: (byOrder.get(o.id) ?? []).sort((a, b) => a - b),
      totalCents: o.totalCents,
      createdAtIso: o.createdAt.toISOString(),
      status:
        o.status === "paid"
          ? "paid"
          : o.status === "cancelled"
            ? "cancelled"
            : o.reservedUntil.getTime() > now
              ? "pending"
              : "expired",
    }));
  } catch (err) {
    console.warn("[admin] fallback sem banco:", (err as Error).message);
    return [];
  }
}

export default async function AdminPage() {
  await ensureAdminOrRedirect();

  const [stats, allOrders] = await Promise.all([
    getGridStateSafe(),
    loadOrders(),
  ]);

  // Receita confirmada vem da grade (números pagos × preço); a pendente,
  // da soma dos pedidos com reserva ativa aguardando Pix.
  const pendingCents = allOrders
    .filter((o) => o.status === "pending")
    .reduce((sum, o) => sum + o.totalCents, 0);
  const confirmedPct = Math.min(
    100,
    (stats.raisedCents / CAMPAIGN.goalCents) * 100,
  );
  const pendingPct = Math.min(
    100 - confirmedPct,
    (pendingCents / CAMPAIGN.goalCents) * 100,
  );
  const freeCount =
    CAMPAIGN.totalNumbers - stats.paidCount - stats.reservedCount;

  // URL canônica de produção: o link-comprovante precisa funcionar no
  // celular do comprador mesmo quando a confirmação é feita do ambiente local.
  const siteUrl = CAMPAIGN.siteUrl;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 pb-10 md:max-w-3xl">
      <header className="flex items-center justify-between bg-grass-900 px-4 py-3 text-white">
        <h1 className="text-base font-extrabold">Painel da rifa</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-grass-100 underline">
            sair
          </button>
        </form>
      </header>

      {/* Dashboard: receita confirmada × aguardando + cotas */}
      <section className="px-4 pt-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-grass-100">
          <p className="text-2xl font-extrabold text-grass-800 tabular">
            {formatBRL(stats.raisedCents)}{" "}
            <span className="text-sm font-semibold text-stone-500">
              / {formatBRL(CAMPAIGN.goalCents)} ({formatPct(confirmedPct)})
            </span>
          </p>
          {/* Barra em dois segmentos: confirmado (verde→ouro) + aguardando (âmbar) */}
          <div
            className="mt-2 flex h-3 overflow-hidden rounded-full bg-grass-100"
            role="progressbar"
            aria-valuenow={Math.round(confirmedPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Arrecadação confirmada: ${formatBRL(stats.raisedCents)}; aguardando pagamento: ${formatBRL(pendingCents)}`}
          >
            {/* Larguras mínimas: qualquer valor > 0 já pinta um traço visível */}
            <div
              className="h-full bg-gradient-to-r from-grass-600 to-gold-500"
              style={{
                width: `${confirmedPct > 0 ? Math.max(confirmedPct, 1.5) : 0}%`,
              }}
            />
            <div
              className="h-full bg-amber-300"
              style={{
                width: `${pendingPct > 0 ? Math.max(pendingPct, 1.5) : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-stone-600">
            {formatBRL(stats.raisedCents)} confirmados
            {pendingCents > 0 && (
              <> · {formatBRL(pendingCents)} aguardando Pix</>
            )}
          </p>
          <p className="mt-1 text-sm text-stone-600 tabular">
            {stats.paidCount} de {CAMPAIGN.totalNumbers} cotas vendidas ·{" "}
            {stats.reservedCount} reservadas · {freeCount} livres
          </p>
        </div>
      </section>

      {/* Busca, filtros, lista densa, paginação e ações em massa */}
      <div className="mt-3">
        <OrdersPanel orders={allOrders} siteUrl={siteUrl} />
      </div>
    </main>
  );
}
