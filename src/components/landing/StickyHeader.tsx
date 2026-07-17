import Link from "next/link";
import { Trophy } from "lucide-react";
import { CAMPAIGN } from "@/lib/config";

type Props = {
  /** Percentual da meta já arrecadado (0–100, pode ter fração). */
  pct: number;
};

/** "0,4%" vira "<1%" — mais honesto que um "0%" com dinheiro já em caixa. */
export function formatPct(pct: number): string {
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

/**
 * Cabeçalho leve que acompanha a rolagem: identidade da campanha à esquerda
 * e um mini-indicador do progresso da meta à direita. Puramente informativo —
 * o CTA continua sendo o botão do herói / barra fixa do rodapé.
 */
export function StickyHeader({ pct }: Props) {
  return (
    <div className="sticky top-0 z-30 border-b border-grass-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-center gap-2 px-4 py-2.5 md:max-w-5xl md:px-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-extrabold text-grass-900"
        >
          <Trophy className="h-4 w-4 text-gold-600" aria-hidden />
          Rifa do {CAMPAIGN.childName}
        </Link>

        <div
          className="ml-auto flex items-center gap-2"
          title={`${formatPct(pct)} da meta arrecadada`}
        >
          <div
            className="h-1.5 w-20 overflow-hidden rounded-full bg-grass-100 sm:w-28"
            aria-hidden
          >
            {/* Largura mínima: com qualquer valor em caixa a barra já aparece */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-grass-600 to-gold-500 transition-[width] duration-700 ease-out"
              style={{ width: `${pct > 0 ? Math.max(pct, 4) : 0}%` }}
            />
          </div>
          <span className="tabular text-xs font-bold text-grass-700">
            {formatPct(pct)} da meta
          </span>
        </div>
      </div>
    </div>
  );
}
