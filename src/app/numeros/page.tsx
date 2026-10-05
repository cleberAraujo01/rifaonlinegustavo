import Link from "next/link";
import type { Metadata } from "next";
import { CAMPAIGN, formatBRL } from "@/lib/config";
import { NumberGrid } from "@/components/grid/NumberGrid";
import { getGridStateSafe } from "@/db/queries";
import { CancelledBanner } from "@/components/ui/CancelledBanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Escolha seus números · Rifa do ${CAMPAIGN.childName}`,
};

export default async function NumerosPage() {
  // Rifa cancelada: nada de grade nem reserva, só o aviso e o caminho da devolução
  if (CAMPAIGN.cancelled) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 md:max-w-3xl">
        <CancelledBanner />
        <div className="space-y-4 px-4 py-6">
          <CancelledBanner variant="card" />
          <p className="text-center text-sm">
            <Link href="/" className="text-grass-700 underline">
              ← Voltar para a página da rifa
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const { grid } = await getGridStateSafe();
  return (
    <main className="mx-auto w-full max-w-lg flex-1 md:max-w-3xl">
      {/* pt maior descola o conteúdo da borda superior da tela */}
      <header className="flex items-center justify-between gap-3 bg-grass-900 px-4 pb-4 pt-6 text-white sm:pt-7">
        <Link
          href="/"
          className="rounded-lg py-1 pr-2 text-sm text-grass-100 transition-colors hover:text-white"
        >
          ← Voltar
        </Link>
        <h1 className="text-base font-extrabold leading-snug">
          Escolha seus números · {formatBRL(CAMPAIGN.pricePerNumberCents)} cada
        </h1>
      </header>

      <NumberGrid initialGrid={grid} />
    </main>
  );
}
