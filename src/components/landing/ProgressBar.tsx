import { CAMPAIGN, formatBRL } from "@/lib/config";

type Props = {
  raisedCents: number;
  paidCount: number;
  reservedCount: number;
};

export function ProgressBar({ raisedCents, paidCount, reservedCount }: Props) {
  const pct = Math.min(100, Math.round((raisedCents / CAMPAIGN.goalCents) * 100));

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
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da arrecadação"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-grass-600 to-gold-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="font-semibold text-gold-700">{pct}% da meta</span>
        <span className="text-stone-500">
          ✅ {paidCount} pagos · 🔒 {reservedCount} reservados
        </span>
      </div>
      {raisedCents === 0 && (
        <p className="mt-3 rounded-lg bg-grass-50 px-3 py-2 text-center text-sm font-semibold text-grass-700">
          🌱 Seja um dos primeiros apoiadores dessa campanha!
        </p>
      )}
    </div>
  );
}
