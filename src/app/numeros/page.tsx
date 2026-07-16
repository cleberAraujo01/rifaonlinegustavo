import Link from "next/link";
import type { Metadata } from "next";
import { CAMPAIGN, formatBRL } from "@/lib/config";
import { NumberGrid } from "@/components/grid/NumberGrid";
import { getGridStateSafe } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Escolha seus números · Rifa do ${CAMPAIGN.childName}`,
};

export default async function NumerosPage() {
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
