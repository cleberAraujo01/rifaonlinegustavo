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
    <main className="mx-auto w-full max-w-lg flex-1">
      <header className="flex items-center justify-between bg-grass-900 px-4 py-3 text-white">
        <Link href="/" className="text-sm text-grass-100">
          ← Voltar
        </Link>
        <h1 className="text-base font-extrabold">
          Escolha seus números · {formatBRL(CAMPAIGN.pricePerNumberCents)} cada
        </h1>
      </header>

      <NumberGrid initialGrid={grid} />
    </main>
  );
}
