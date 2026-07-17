import { Sprout, Ticket } from "lucide-react";
import { CAMPAIGN, formatBRL } from "@/lib/config";
import { formatPct } from "@/components/landing/StickyHeader";

type Props = {
  raisedCents: number;
  paidCount: number;
  reservedCount: number;
};

export function ProgressBar({ raisedCents, paidCount, reservedCount }: Props) {
  const pct = Math.min(100, (raisedCents / CAMPAIGN.goalCents) * 100);
  // Números "garantidos" = pagos + reservados: prova social e senso de escassez.
  const taken = paidCount + reservedCount;
  const remaining = CAMPAIGN.totalNumbers - taken;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-grass-100">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xl font-extrabold text-grass-800 tabular">
          {formatBRL(raisedCents)}
        </span>
        <span className="text-sm text-stone-500">
          meta {formatBRL(CAMPAIGN.goalCents)}
        </span>
      </div>
      <div
        className="h-4 overflow-hidden rounded-full bg-grass-100"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da arrecadação"
      >
        {/* Largura mínima quando há valor em caixa: barra visível desde a 1ª venda */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-grass-600 to-gold-500 transition-[width] duration-700 ease-out"
          style={{ width: `${pct > 0 ? Math.max(pct, 2.5) : 0}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="font-semibold text-gold-700">
          {formatPct(pct)} da meta
        </span>
        <span className="text-stone-500">
          {paidCount} pagos · {reservedCount} reservados
        </span>
      </div>

      {/* Quantos já foram garantidos e quantos restam, dos 700 */}
      {taken > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-grass-50 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-bold text-grass-800">
            <Ticket className="h-4 w-4 shrink-0 text-gold-600" aria-hidden />
            {taken} de {CAMPAIGN.totalNumbers} números garantidos
          </span>
          <span className="shrink-0 rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-extrabold text-gold-800">
            restam {remaining}
          </span>
        </div>
      )}

      {/* Sem pagamento confirmado ainda: mensagem positiva no lugar do "0%" */}
      {paidCount === 0 && (
        <p className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-grass-50 px-3 py-2 text-center text-sm font-semibold text-grass-700">
          <Sprout className="h-4 w-4 shrink-0" aria-hidden />
          Seja um dos primeiros apoiadores dessa campanha!
        </p>
      )}
    </div>
  );
}
