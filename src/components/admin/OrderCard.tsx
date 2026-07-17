"use client";

import { useState, useTransition } from "react";
import { cancelarPedido, confirmarPagamento } from "@/actions/admin";
import { buildConfirmationMessage, formatBRL, formatNumber } from "@/lib/config";

type Props = {
  orderId: string;
  buyerName: string;
  buyerPhone: string;
  numbers: number[];
  totalCents: number;
  createdAtIso: string;
  isPaid: boolean;
  /** Origem pública do site (para montar o link do comprovante). */
  siteUrl: string;
};

export function OrderCard({
  orderId,
  buyerName,
  buyerPhone,
  numbers,
  totalCents,
  createdAtIso,
  isPaid,
  siteUrl,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(orderId);
      if (!result.ok) setError(result.message ?? "Erro");
    });
  }

  const createdLabel = new Date(createdAtIso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`rounded-xl bg-white p-4 ring-1 ${
        isPaid ? "ring-gold-400" : "ring-grass-100"
      } ${pending ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-grass-900">{buyerName}</p>
          <p className="text-xs text-stone-500">{createdLabel}</p>
        </div>
        <span className="shrink-0 font-extrabold text-grass-800 tabular">
          {formatBRL(totalCents)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {numbers.map((n) => (
          <span
            key={n}
            className={`tabular rounded px-2 py-0.5 text-xs font-bold ${
              isPaid ? "bg-gold-100 text-gold-700" : "bg-grass-100 text-grass-800"
            }`}
          >
            {formatNumber(n)}
          </span>
        ))}
      </div>

      {error && (
        <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {!isPaid && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(confirmarPagamento)}
            className="flex-1 rounded-lg bg-grass-600 py-2 text-sm font-extrabold text-white active:bg-grass-700"
          >
            ✓ Confirmar
          </button>
        )}
        {isPaid && (
          /* Agradecimento com os números e o link-comprovante do pedido:
             abre a conversa do comprador com a mensagem pronta */
          <a
            href={`https://wa.me/${buyerPhone}?text=${encodeURIComponent(
              buildConfirmationMessage(
                numbers,
                buyerName,
                `${siteUrl}/reserva/${orderId}`,
              ),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg bg-whatsapp py-2 text-center text-sm font-extrabold text-white active:bg-whatsapp-dark"
          >
            📤 Enviar confirmação
          </a>
        )}
        <a
          href={`https://wa.me/${buyerPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir conversa com ${buyerName} no WhatsApp`}
          className="rounded-lg bg-whatsapp px-3 py-2 text-sm font-extrabold text-white"
        >
          💬
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Cancelar o pedido de ${buyerName} e liberar os números?`)) {
              run(cancelarPedido);
            }
          }}
          className="rounded-lg px-3 py-2 text-sm font-bold text-red-600 ring-1 ring-red-200 active:bg-red-50"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
