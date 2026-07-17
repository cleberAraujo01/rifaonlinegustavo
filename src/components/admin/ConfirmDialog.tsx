"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  /** Conteúdo livre (texto, lista de pedidos etc.). */
  children?: ReactNode;
  confirmLabel: string;
  /** Ação destrutiva pinta o botão de vermelho. */
  destructive?: boolean;
  /** Desabilita os botões enquanto a ação roda. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Diálogo de confirmação próprio (em vez de window.confirm): estilizável,
 * acessível (alertdialog + Esc + foco inicial no botão seguro) e não trava
 * automações de navegador como o confirm() nativo.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Foco no botão seguro: Enter por engano não executa a ação.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
      >
        <h3 className="text-base font-extrabold text-grass-900">{title}</h3>
        {children && (
          <div className="mt-2 text-sm text-stone-600">{children}</div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-stone-600 ring-1 ring-stone-200 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grass-700"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
              destructive
                ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-700"
                : "bg-grass-600 hover:bg-grass-700 focus-visible:ring-grass-700"
            } ${busy ? "opacity-60" : ""}`}
          >
            {busy ? "Executando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
