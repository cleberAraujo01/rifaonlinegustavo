"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/config";
import { OrderCard } from "@/components/admin/OrderCard";

export type OrderData = {
  orderId: string;
  buyerName: string;
  buyerPhone: string;
  numbers: number[];
  totalCents: number;
  createdAtIso: string;
};

type Props = {
  pending: OrderData[];
  paid: OrderData[];
  siteUrl: string;
};

/** Reservas paradas há mais que isso ganham o alerta "cobrar?". */
const NUDGE_AFTER_DAYS = 3;
/** Quantos confirmados aparecem por página do "ver mais". */
const PAID_PAGE = 10;

/** minúsculas e sem acentos: "João" → "joao" (busca tolerante) */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function matches(o: OrderData, q: string): boolean {
  const nq = norm(q.trim());
  if (!nq) return true;
  if (norm(o.buyerName).includes(nq)) return true;
  const digits = nq.replace(/\D/g, "");
  if (!digits) return false;
  if (o.buyerPhone.includes(digits)) return true;
  return o.numbers.some((n) => formatNumber(n).includes(digits));
}

function ageDays(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function ageLabel(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

/**
 * Listas do painel prontas para escalar até 700 números:
 * busca por nome/número/telefone, fila de pendentes com os mais antigos
 * primeiro (fila de cobrança) e confirmados recolhidos por padrão.
 */
export function OrdersPanel({ pending, paid, siteUrl }: Props) {
  const [query, setQuery] = useState("");
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidShown, setPaidShown] = useState(PAID_PAGE);

  const searching = query.trim() !== "";

  // Pendentes: mais antigos primeiro — o que está parado é o que precisa de atenção.
  const pendingFiltered = useMemo(
    () =>
      pending
        .filter((o) => matches(o, query))
        .sort(
          (a, b) =>
            new Date(a.createdAtIso).getTime() -
            new Date(b.createdAtIso).getTime(),
        ),
    [pending, query],
  );

  // Confirmados: mais recentes primeiro (consulta, não fila de trabalho).
  const paidFiltered = useMemo(
    () => paid.filter((o) => matches(o, query)),
    [paid, query],
  );
  // Busca abre a seção sozinha; sem busca, respeita o recolhido + paginação.
  const paidVisible = searching ? paidFiltered : paidFiltered.slice(0, paidShown);
  const showPaidList = searching || paidOpen;

  return (
    <>
      {/* Busca: acompanha a rolagem para estar sempre à mão */}
      <div className="sticky top-0 z-10 bg-grass-50/95 px-4 py-3 backdrop-blur">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Buscar por nome, número ou telefone"
          aria-label="Buscar pedido por nome do comprador, número da rifa ou telefone"
          className="w-full rounded-xl border border-grass-200 bg-white px-4 py-3 text-sm transition-colors focus:border-grass-600 focus:outline-none"
        />
      </div>

      {/* Aguardando pagamento */}
      <section className="mt-1 px-4">
        <h2 className="mb-3 text-lg font-extrabold text-grass-900">
          ⏳ Aguardando pagamento ({pendingFiltered.length})
        </h2>
        {pendingFiltered.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-stone-500 ring-1 ring-grass-100">
            {searching
              ? "Nenhum pedido pendente bate com a busca."
              : "Nenhuma reserva pendente no momento."}
          </p>
        ) : (
          <div className="space-y-3">
            {pendingFiltered.map((o) => (
              <OrderCard
                key={o.orderId}
                orderId={o.orderId}
                buyerName={o.buyerName}
                buyerPhone={o.buyerPhone}
                numbers={o.numbers}
                totalCents={o.totalCents}
                createdAtIso={o.createdAtIso}
                isPaid={false}
                siteUrl={siteUrl}
                ageLabel={ageLabel(o.createdAtIso)}
                nudge={ageDays(o.createdAtIso) >= NUDGE_AFTER_DAYS}
              />
            ))}
          </div>
        )}
      </section>

      {/* Confirmados: arquivo de consulta — recolhido por padrão */}
      <section className="mt-6 px-4">
        <button
          type="button"
          onClick={() => setPaidOpen((v) => !v)}
          aria-expanded={showPaidList}
          className="mb-3 flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-lg font-extrabold text-grass-900 ring-1 ring-grass-100 transition-colors hover:bg-grass-50"
        >
          <span>✅ Confirmados ({paidFiltered.length})</span>
          {!searching && (
            <span className="text-sm text-stone-400">
              {paidOpen ? "recolher ▲" : "abrir ▼"}
            </span>
          )}
        </button>

        {showPaidList &&
          (paidFiltered.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-sm text-stone-500 ring-1 ring-grass-100">
              {searching
                ? "Nenhum pedido confirmado bate com a busca."
                : "Nenhum pagamento confirmado ainda."}
            </p>
          ) : (
            <div className="space-y-3">
              {paidVisible.map((o) => (
                <OrderCard
                  key={o.orderId}
                  orderId={o.orderId}
                  buyerName={o.buyerName}
                  buyerPhone={o.buyerPhone}
                  numbers={o.numbers}
                  totalCents={o.totalCents}
                  createdAtIso={o.createdAtIso}
                  isPaid
                  siteUrl={siteUrl}
                  ageLabel={ageLabel(o.createdAtIso)}
                />
              ))}
              {!searching && paidFiltered.length > paidShown && (
                <button
                  type="button"
                  onClick={() => setPaidShown((n) => n + PAID_PAGE)}
                  className="w-full rounded-xl bg-white py-3 text-sm font-bold text-grass-700 ring-1 ring-grass-200 transition-colors hover:bg-grass-50"
                >
                  Ver mais ({paidFiltered.length - paidShown} restantes)
                </button>
              )}
            </div>
          ))}
      </section>
    </>
  );
}
