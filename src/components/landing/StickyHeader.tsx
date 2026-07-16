import Link from "next/link";
import { CAMPAIGN } from "@/lib/config";

type Props = {
  /** Percentual da meta já arrecadado (0–100). */
  pct: number;
};

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
          <span aria-hidden>⚽</span> Rifa do {CAMPAIGN.childName}
        </Link>

        <div
          className="ml-auto flex items-center gap-2"
          title={`${pct}% da meta arrecadada`}
        >
          <div
            className="h-1.5 w-20 overflow-hidden rounded-full bg-grass-100 sm:w-28"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-grass-600 to-gold-500 transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tabular text-xs font-bold text-grass-700">
            {pct}% da meta
          </span>
        </div>
      </div>
    </div>
  );
}
