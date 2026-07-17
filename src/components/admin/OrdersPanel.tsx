"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Search } from "lucide-react";
import { confirmarPagamentos } from "@/actions/admin";
import { buildChargeMessage, formatBRL, formatNumber } from "@/lib/config";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { OrderRow } from "@/components/admin/OrderRow";

export type OrderStatus = "pending" | "paid" | "expired" | "cancelled";

export type OrderData = {
  orderId: string;
  buyerName: string;
  buyerPhone: string;
  numbers: number[];
  totalCents: number;
  createdAtIso: string;
  status: OrderStatus;
};

type Props = {
  orders: OrderData[];
  siteUrl: string;
};

/** Reservas paradas há mais que isso ganham o alerta "cobrar?". */
const NUDGE_AFTER_DAYS = 3;

const CHIPS: Array<{ key: OrderStatus; label: string }> = [
  { key: "pending", label: "Pendentes" },
  { key: "paid", label: "Confirmados" },
  { key: "expired", label: "Expirados" },
  { key: "cancelled", label: "Cancelados" },
];

type SortKey = "oldest" | "newest" | "value" | "quota";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "oldest", label: "Mais antigos primeiro" },
  { key: "newest", label: "Mais recentes primeiro" },
  { key: "value", label: "Maior valor" },
  { key: "quota", label: "Menor cota" },
];

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
 * Painel de pedidos para ~700 cotas: os chips de status são as "seções"
 * (Pendentes primeiro e já aberta, como fila de trabalho), com busca,
 * ordenação, paginação (25/50 por página — só a página atual vai ao DOM,
 * dispensando virtualização) e ações em massa com confirmação.
 */
export function OrdersPanel({ orders, siteUrl }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<OrderStatus>("pending");
  const [sort, setSort] = useState<SortKey>("oldest");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<25 | 50>(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkChargeOpen, setBulkChargeOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkBusy, startBulk] = useTransition();

  // Contagem por status já respeitando a busca — os chips viram um mapa
  // de "onde estão os resultados".
  const counts = useMemo(() => {
    const c: Record<OrderStatus, number> = {
      pending: 0,
      paid: 0,
      expired: 0,
      cancelled: 0,
    };
    for (const o of orders) if (matches(o, query)) c[o.status]++;
    return c;
  }, [orders, query]);

  const list = useMemo(() => {
    const filtered = orders.filter(
      (o) => o.status === chip && matches(o, query),
    );
    const byCreated = (a: OrderData, b: OrderData) =>
      new Date(a.createdAtIso).getTime() - new Date(b.createdAtIso).getTime();
    switch (sort) {
      case "oldest":
        return filtered.sort(byCreated);
      case "newest":
        return filtered.sort((a, b) => byCreated(b, a));
      case "value":
        return filtered.sort((a, b) => b.totalCents - a.totalCents);
      case "quota":
        return filtered.sort(
          (a, b) =>
            Math.min(...(a.numbers.length ? a.numbers : [Infinity])) -
            Math.min(...(b.numbers.length ? b.numbers : [Infinity])),
        );
    }
  }, [orders, chip, query, sort]);

  const pageCount = Math.max(1, Math.ceil(list.length / perPage));
  const safePage = Math.min(page, pageCount);
  const pageItems = list.slice((safePage - 1) * perPage, safePage * perPage);

  const selectable = chip === "pending";
  const selectedOrders = orders.filter(
    (o) => selected.has(o.orderId) && o.status === "pending",
  );
  const pageAllSelected =
    selectable &&
    pageItems.length > 0 &&
    pageItems.every((o) => selected.has(o.orderId));

  function resetPaging() {
    setPage(1);
    setSelected(new Set());
  }

  function switchChip(next: OrderStatus) {
    setChip(next);
    // Fila de pendentes: antigos primeiro; demais listas: recentes primeiro.
    setSort(next === "pending" ? "oldest" : "newest");
    resetPaging();
  }

  function toggleSelect(orderId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function togglePageAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) pageItems.forEach((o) => next.delete(o.orderId));
      else pageItems.forEach((o) => next.add(o.orderId));
      return next;
    });
  }

  function runBulkConfirm() {
    setBulkError(null);
    startBulk(async () => {
      const result = await confirmarPagamentos(
        selectedOrders.map((o) => o.orderId),
      );
      setBulkConfirmOpen(false);
      if (!result.ok) setBulkError(result.message ?? "Erro na ação em massa");
      setSelected(new Set());
      router.refresh();
    });
  }

  // Janela de até 5 páginas ao redor da atual para a navegação numérica.
  const pageWindow = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, pageCount - 4));
    return Array.from(
      { length: Math.min(5, pageCount) },
      (_, i) => start + i,
    );
  }, [safePage, pageCount]);

  return (
    <>
      {/* Busca + filtros: acompanham a rolagem */}
      <div className="sticky top-0 z-10 space-y-2 bg-grass-50/95 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPaging();
            }}
            placeholder="Buscar por nome, número ou telefone"
            aria-label="Buscar pedido por nome do comprador, número da rifa ou telefone"
            className="w-full rounded-xl border border-grass-200 bg-white py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-grass-600 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5" role="tablist">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={chip === c.key}
              onClick={() => switchChip(c.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grass-700 ${
                chip === c.key
                  ? "bg-grass-700 text-white"
                  : "bg-white text-grass-800 ring-1 ring-grass-200 hover:bg-grass-100"
              }`}
            >
              {c.label} ({counts[c.key]})
            </button>
          ))}
        </div>
      </div>

      <section className="px-4 pb-2">
        {/* Ordenação + itens por página */}
        <div className="mb-2 flex items-center gap-2 text-xs">
          <label className="sr-only" htmlFor="sort">
            Ordenar por
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              resetPaging();
            }}
            className="rounded-lg border border-grass-200 bg-white px-2 py-1.5 font-semibold text-grass-800 focus:border-grass-600 focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="per-page">
            Itens por página
          </label>
          <select
            id="per-page"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value) as 25 | 50);
              resetPaging();
            }}
            className="rounded-lg border border-grass-200 bg-white px-2 py-1.5 font-semibold text-grass-800 focus:border-grass-600 focus:outline-none"
          >
            <option value={25}>25 / página</option>
            <option value={50}>50 / página</option>
          </select>
          {selectable && pageItems.length > 0 && (
            <label className="ml-auto flex items-center gap-1.5 font-semibold text-stone-600">
              <input
                type="checkbox"
                checked={pageAllSelected}
                onChange={togglePageAll}
                className="h-4 w-4 accent-grass-600"
              />
              selecionar página
            </label>
          )}
        </div>

        {/* Barra de ações em massa */}
        {selectable && selectedOrders.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-grass-900 px-3 py-2 text-white">
            <span className="text-xs font-bold">
              {selectedOrders.length} selecionado
              {selectedOrders.length > 1 ? "s" : ""} ·{" "}
              {formatBRL(
                selectedOrders.reduce((sum, o) => sum + o.totalCents, 0),
              )}
            </span>
            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(true)}
                className="rounded-lg bg-grass-600 px-2.5 py-1.5 text-xs font-extrabold hover:bg-grass-500"
              >
                ✓ Confirmar selecionados
              </button>
              <button
                type="button"
                onClick={() => setBulkChargeOpen(true)}
                className="rounded-lg bg-whatsapp px-2.5 py-1.5 text-xs font-extrabold hover:bg-whatsapp-dark"
              >
                <MessageCircle
                  className="mr-1 inline h-3.5 w-3.5"
                  aria-hidden
                />
                Cobrar em massa
              </button>
            </div>
          </div>
        )}

        {bulkError && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {bulkError}
          </p>
        )}

        {/* Lista densa */}
        {pageItems.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-stone-500 ring-1 ring-grass-100">
            {query.trim()
              ? "Nenhum pedido bate com a busca neste filtro."
              : "Nenhum pedido aqui ainda."}
          </p>
        ) : (
          <ul className="divide-y divide-grass-100 rounded-xl ring-1 ring-grass-100">
            {pageItems.map((o) => (
              <OrderRow
                key={o.orderId}
                order={o}
                siteUrl={siteUrl}
                ageLabel={ageLabel(o.createdAtIso)}
                nudge={
                  o.status === "pending" &&
                  ageDays(o.createdAtIso) >= NUDGE_AFTER_DAYS
                }
                selectable={selectable}
                selected={selected.has(o.orderId)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </ul>
        )}

        {/* Paginação numérica */}
        {pageCount > 1 && (
          <nav
            aria-label="Paginação dos pedidos"
            className="mt-3 flex items-center justify-center gap-1"
          >
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              aria-label="Página anterior"
              className="h-8 w-8 rounded-lg bg-white text-sm font-bold text-grass-700 ring-1 ring-grass-200 disabled:opacity-30"
            >
              ‹
            </button>
            {pageWindow.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === safePage ? "page" : undefined}
                className={`h-8 min-w-8 rounded-lg px-1 text-sm font-bold tabular ${
                  p === safePage
                    ? "bg-grass-700 text-white"
                    : "bg-white text-grass-700 ring-1 ring-grass-200 hover:bg-grass-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage === pageCount}
              onClick={() => setPage(safePage + 1)}
              aria-label="Próxima página"
              className="h-8 w-8 rounded-lg bg-white text-sm font-bold text-grass-700 ring-1 ring-grass-200 disabled:opacity-30"
            >
              ›
            </button>
          </nav>
        )}
      </section>

      {/* Confirmação em massa */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        title={`Confirmar ${selectedOrders.length} pagamento${selectedOrders.length > 1 ? "s" : ""}?`}
        confirmLabel="Sim, confirmar todos"
        busy={bulkBusy}
        onConfirm={runBulkConfirm}
        onCancel={() => setBulkConfirmOpen(false)}
      >
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {selectedOrders.map((o) => (
            <li key={o.orderId} className="text-xs">
              <strong>{o.buyerName}</strong> —{" "}
              {o.numbers.map(formatNumber).join(", ")} ·{" "}
              {formatBRL(o.totalCents)}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">
          Use somente depois de conferir os comprovantes de todos.
        </p>
      </ConfirmDialog>

      {/* Cobrança em massa: o WhatsApp não permite envio automático em lote —
          o diálogo vira uma fila de conversas prontas, uma por comprador */}
      <ConfirmDialog
        open={bulkChargeOpen}
        title={`Cobrar ${selectedOrders.length} comprador${selectedOrders.length > 1 ? "es" : ""}`}
        confirmLabel="Concluir"
        onConfirm={() => setBulkChargeOpen(false)}
        onCancel={() => setBulkChargeOpen(false)}
      >
        <p className="mb-2 text-xs text-stone-500">
          Toque em cada nome — a conversa abre com a cobrança pronta, é só
          enviar e voltar aqui.
        </p>
        <ul className="max-h-48 space-y-1.5 overflow-y-auto">
          {selectedOrders.map((o) => (
            <li key={o.orderId}>
              <a
                href={`https://wa.me/${o.buyerPhone}?text=${encodeURIComponent(
                  buildChargeMessage(o.numbers, o.buyerName),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg bg-grass-50 px-3 py-2 text-xs font-bold text-grass-800 transition-colors visited:opacity-50 hover:bg-grass-100"
              >
                <span className="truncate">{o.buyerName}</span>
                <span className="tabular shrink-0 text-stone-500">
                  {formatBRL(o.totalCents)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </>
  );
}
