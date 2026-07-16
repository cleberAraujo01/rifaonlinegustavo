"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CAMPAIGN, formatBRL, formatNumber } from "@/lib/config";
import { reservarNumeros } from "@/actions/reservar";

/** 'D' = disponível, 'R' = reservado, 'P' = pago — 1 char por número. */
type Props = { initialGrid: string };

const MAX_N = CAMPAIGN.totalNumbers - 1;
const BLOCKS = Array.from(
  { length: Math.ceil(CAMPAIGN.totalNumbers / 100) },
  (_, i) => i,
);
const POLL_MS = 15_000;

export function NumberGrid({ initialGrid }: Props) {
  const router = useRouter();
  const [grid, setGrid] = useState(initialGrid);
  const [block, setBlock] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Polling: mantém a grade fresca sem recarregar a página.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/grid", { cache: "no-store" });
        if (res.ok) {
          const data: { grid: string } = await res.json();
          setGrid(data.grid);
          // Deseleciona números que deixaram de estar livres.
          setSelected((prev) => prev.filter((n) => data.grid[n] === "D"));
        }
      } catch {
        // rede instável: mantém o último estado conhecido
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const availableCount = useMemo(
    () => [...grid].filter((c) => c === "D").length,
    [grid],
  );

  function toggle(n: number) {
    if (grid[n] !== "D") return;
    setError(null);
    setSelected((prev) =>
      prev.includes(n)
        ? prev.filter((x) => x !== n)
        : prev.length >= CAMPAIGN.maxNumbersPerOrder
          ? prev
          : [...prev, n],
    );
  }

  function pickRandom(count: number) {
    const pool: number[] = [];
    for (let n = 0; n < CAMPAIGN.totalNumbers; n++) {
      if (grid[n] === "D" && !selected.includes(n)) pool.push(n);
    }
    const picked: number[] = [];
    const room = CAMPAIGN.maxNumbersPerOrder - selected.length;
    for (let i = 0; i < Math.min(count, room, pool.length); i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    if (picked.length > 0) {
      setSelected((prev) => [...prev, ...picked]);
      setBlock(Math.floor(picked[0] / 100));
    }
  }

  function goToSearch(value: string) {
    setSearch(value);
    const n = parseInt(value, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= MAX_N) setBlock(Math.floor(n / 100));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await reservarNumeros({
        numbers: selected,
        name: buyerName,
        phone: buyerPhone,
      });

      if (result.ok) {
        router.push(`/reserva/${result.orderId}`);
        return;
      }

      setError(result.message);
      if (result.error === "NUMBERS_TAKEN" && result.takenNumbers) {
        const taken = new Set(result.takenNumbers);
        setSelected((prev) => prev.filter((n) => !taken.has(n)));
        // Atualiza a grade imediatamente para refletir a corrida perdida.
        try {
          const res = await fetch("/api/grid", { cache: "no-store" });
          if (res.ok) setGrid((await res.json()).grid);
        } catch {}
      }
    });
  }

  const searched = search !== "" ? parseInt(search, 10) : null;
  const totalCents = selected.length * CAMPAIGN.pricePerNumberCents;
  const canReserve =
    selected.length > 0 &&
    buyerName.trim().length >= 3 &&
    buyerPhone.replace(/\D/g, "").length >= 10 &&
    !pending;

  return (
    <div className="pb-72">
      {/* Busca + aleatórios */}
      <div className="sticky top-0 z-10 space-y-2 border-b border-grass-100 bg-grass-50/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2">
          <input
            type="tel"
            inputMode="numeric"
            maxLength={3}
            placeholder="🔍 Buscar nº"
            value={search}
            onChange={(e) => goToSearch(e.target.value.replace(/\D/g, ""))}
            className="w-28 rounded-xl border border-grass-200 bg-white px-3 py-2 text-sm tabular focus:border-grass-600 focus:outline-none"
          />
          <div className="flex flex-1 gap-1">
            {[1, 5, 10].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pickRandom(c)}
                className="flex-1 rounded-xl bg-white px-2 py-2 text-sm font-bold text-grass-700 ring-1 ring-grass-200 active:bg-grass-100"
              >
                🎲 +{c}
              </button>
            ))}
          </div>
        </div>

        {/* Navegação por blocos de 100 */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {BLOCKS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBlock(b)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold tabular ${
                block === b
                  ? "bg-grass-700 text-white"
                  : "bg-white text-grass-700 ring-1 ring-grass-200"
              }`}
            >
              {formatNumber(b * 100)}–{formatNumber(b * 100 + 99)}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex justify-center gap-4 px-4 py-3 text-xs text-stone-600">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-white ring-1 ring-grass-300" /> livre
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-stone-300" /> 🔒 reservado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-gold-400" /> ✓ pago
        </span>
        <span className="ml-auto font-semibold text-grass-700">
          {availableCount} livres
        </span>
      </div>

      {/* Grade: renderiza SÓ o bloco ativo (100 células); 10 colunas no desktop */}
      <div className="grid grid-cols-5 gap-1.5 px-4 md:grid-cols-10">
        {Array.from({ length: 100 }, (_, i) => {
          const n = block * 100 + i;
          const status = grid[n];
          const isSelected = selected.includes(n);
          const isSearched = searched === n;

          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              disabled={status !== "D"}
              aria-label={`Número ${formatNumber(n)}: ${
                status === "P" ? "pago" : status === "R" ? "reservado" : isSelected ? "selecionado" : "disponível"
              }`}
              className={`tabular flex h-12 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                isSelected
                  ? "bg-grass-600 text-white ring-2 ring-grass-700"
                  : status === "P"
                    ? "bg-gold-400 text-gold-700"
                    : status === "R"
                      ? "bg-stone-300 text-stone-500"
                      : "bg-white text-grass-800 ring-1 ring-grass-200 active:bg-grass-100"
              } ${isSearched ? "ring-4 ring-gold-500" : ""}`}
            >
              {status === "P" ? "✓" : status === "R" ? "🔒" : formatNumber(n)}
            </button>
          );
        })}
      </div>

      {/* Barra de seleção + formulário de reserva */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-grass-200 bg-white p-3 shadow-2xl">
          <div className="mx-auto max-w-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-grass-900">
                {selected.length} número{selected.length > 1 ? "s" : ""} ·{" "}
                {formatBRL(totalCents)}
              </span>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-stone-400 underline"
              >
                limpar
              </button>
            </div>
            <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
              {[...selected]
                .sort((a, b) => a - b)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggle(n)}
                    className="tabular rounded-md bg-grass-100 px-2 py-1 text-xs font-bold text-grass-800"
                  >
                    {formatNumber(n)} ✕
                  </button>
                ))}
            </div>
            <input
              type="text"
              autoComplete="name"
              placeholder="Seu nome completo"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full rounded-xl border border-grass-200 px-3 py-3 text-sm focus:border-grass-600 focus:outline-none"
            />
            <input
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="Seu WhatsApp com DDD (ex: 11 91234-5678)"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="w-full rounded-xl border border-grass-200 px-3 py-3 text-sm focus:border-grass-600 focus:outline-none"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!canReserve}
              className={`w-full rounded-xl py-4 text-center text-base font-extrabold text-white ${
                canReserve
                  ? "bg-grass-600 active:bg-grass-700"
                  : "bg-stone-300"
              }`}
            >
              {pending ? "Reservando..." : `RESERVAR POR ${formatBRL(totalCents)} →`}
            </button>
            <p className="text-center text-xs text-stone-400">
              Reserva válida por {CAMPAIGN.reservationHours}h · pagamento via Pix na próxima tela
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
