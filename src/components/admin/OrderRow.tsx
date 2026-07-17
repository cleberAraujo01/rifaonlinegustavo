"use client";

import { useState, useTransition } from "react";
import { cancelarPedido, confirmarPagamento } from "@/actions/admin";
import {
  buildChargeMessage,
  buildConfirmationMessage,
  buildReinviteMessage,
  formatBRL,
  formatNumber,
} from "@/lib/config";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { OrderData } from "@/components/admin/OrdersPanel";

type Props = {
  order: OrderData;
  siteUrl: string;
  ageLabel: string;
  /** Reserva parada há dias: destaca para cobrança. */
  nudge?: boolean;
  /** Checkbox de seleção (só na fila de pendentes). */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (orderId: string) => void;
};

/**
 * Linha densa do painel: uma faixa única com nome, cotas, valor, data e
 * ações — ~metade da altura dos cards antigos, pensada para listas longas.
 * Mobile: duas linhas enxutas; desktop (md+): colunas alinhadas em grid.
 */
export function OrderRow({
  order,
  siteUrl,
  ageLabel,
  nudge = false,
  selectable = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { orderId, buyerName, buyerPhone, numbers, totalCents, status } = order;

  function run(action: (id: string) => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(orderId);
      if (!result.ok) setError(result.message ?? "Erro");
    });
  }

  const createdLabel = new Date(order.createdAtIso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const badgeClass =
    status === "paid"
      ? "bg-gold-100 text-gold-800"
      : status === "pending"
        ? "bg-grass-100 text-grass-800"
        : "bg-stone-100 text-stone-500";

  const smallBtn =
    "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grass-700";

  return (
    <li
      className={`bg-white px-3 py-2 first:rounded-t-xl last:rounded-b-xl ${
        pending ? "opacity-50" : ""
      } ${status === "cancelled" || status === "expired" ? "opacity-70" : ""} ${
        nudge ? "border-l-4 border-amber-400" : ""
      }`}
    >
      <div className="flex items-center gap-2 md:grid md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] md:gap-3">
        {selectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(orderId)}
            aria-label={`Selecionar pedido de ${buyerName}`}
            className="h-5 w-5 shrink-0 accent-grass-600"
          />
        ) : (
          <span className="hidden md:block" aria-hidden />
        )}

        {/* Nome + valor (mobile: mesma linha; desktop: colunas) */}
        <div className="min-w-0 flex-1 md:flex md:items-center md:gap-2">
          <p className="truncate text-sm font-bold text-grass-900">
            {buyerName}
            {nudge && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                ⏰ cobrar?
              </span>
            )}
          </p>
        </div>

        {/* Cotas + data */}
        <div className="hidden min-w-0 items-center gap-1.5 md:flex">
          <span className="flex flex-wrap gap-1">
            {numbers.length > 0 ? (
              numbers.map((n) => (
                <span
                  key={n}
                  className={`tabular rounded px-1.5 py-0.5 text-[11px] font-bold ${badgeClass}`}
                >
                  {formatNumber(n)}
                </span>
              ))
            ) : (
              <span className="text-xs text-stone-400">—</span>
            )}
          </span>
          <span className="truncate text-[11px] text-stone-400" suppressHydrationWarning>
            {createdLabel} · {ageLabel}
          </span>
        </div>

        <span className="shrink-0 text-sm font-extrabold text-grass-800 tabular">
          {formatBRL(totalCents)}
        </span>

        {/* Ações */}
        <div className="flex shrink-0 items-center gap-1">
          {status === "pending" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmOpen(true)}
                className={`${smallBtn} bg-grass-600 text-white hover:bg-grass-700`}
              >
                ✓ Confirmar
              </button>
              <a
                href={`https://wa.me/${buyerPhone}?text=${encodeURIComponent(
                  buildChargeMessage(numbers, buyerName),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Cobrar ${buyerName} no WhatsApp`}
                aria-label={`Cobrar ${buyerName} no WhatsApp`}
                className={`${smallBtn} bg-whatsapp text-white hover:bg-whatsapp-dark`}
              >
                💬 Cobrar
              </a>
            </>
          )}

          {status === "paid" && (
            <>
              <a
                href={`https://wa.me/${buyerPhone}?text=${encodeURIComponent(
                  buildConfirmationMessage(numbers, buyerName, `${siteUrl}/reserva/${orderId}`),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Enviar confirmação para ${buyerName}`}
                aria-label={`Enviar confirmação de pagamento para ${buyerName} no WhatsApp`}
                className={`${smallBtn} bg-whatsapp text-white hover:bg-whatsapp-dark`}
              >
                📤 Confirmação
              </a>
              <a
                href={`https://wa.me/${buyerPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Conversar com ${buyerName}`}
                aria-label={`Abrir conversa com ${buyerName} no WhatsApp`}
                className={`${smallBtn} bg-whatsapp px-2 text-white hover:bg-whatsapp-dark`}
              >
                💬
              </a>
            </>
          )}

          {status === "expired" && (
            <a
              href={`https://wa.me/${buyerPhone}?text=${encodeURIComponent(
                buildReinviteMessage(buyerName),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Reconvidar ${buyerName}`}
              aria-label={`Reconvidar ${buyerName} a reservar de novo no WhatsApp`}
              className={`${smallBtn} bg-whatsapp text-white hover:bg-whatsapp-dark`}
            >
              💬 Reconvidar
            </a>
          )}

          {/* Destrutiva: separada por divisor e sempre com confirmação */}
          {(status === "pending" || status === "paid") && (
            <span className="ml-1 border-l border-stone-200 pl-1.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => setCancelOpen(true)}
                title={`Cancelar pedido de ${buyerName}`}
                aria-label={`Cancelar pedido de ${buyerName} e liberar os números`}
                className={`${smallBtn} px-2 text-red-600 ring-1 ring-red-200 hover:bg-red-50`}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1.5 rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* Cotas + data no mobile (linha 2) */}
      <div className="mt-1 flex items-center gap-1.5 pl-7 md:hidden">
        <span className="flex flex-wrap gap-1">
          {numbers.map((n) => (
            <span
              key={n}
              className={`tabular rounded px-1.5 py-0.5 text-[11px] font-bold ${badgeClass}`}
            >
              {formatNumber(n)}
            </span>
          ))}
        </span>
        <span className="text-[11px] text-stone-400" suppressHydrationWarning>
          {createdLabel} · {ageLabel}
        </span>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Confirmar pagamento de ${buyerName}?`}
        confirmLabel="Sim, confirmar"
        busy={pending}
        onConfirm={() => {
          setConfirmOpen(false);
          run(confirmarPagamento);
        }}
        onCancel={() => setConfirmOpen(false)}
      >
        {numbers.map(formatNumber).join(", ")} · {formatBRL(totalCents)} — use
        depois de conferir o comprovante do Pix.
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelOpen}
        title={`Cancelar o pedido de ${buyerName}?`}
        confirmLabel="Sim, cancelar"
        destructive
        busy={pending}
        onConfirm={() => {
          setCancelOpen(false);
          run(cancelarPedido);
        }}
        onCancel={() => setCancelOpen(false)}
      >
        Os números {numbers.map(formatNumber).join(", ")} voltam imediatamente
        para a grade. Essa ação não tem desfazer.
      </ConfirmDialog>
    </li>
  );
}
