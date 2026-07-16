"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CAMPAIGN, formatBRL, formatNumber } from "@/lib/config";
import { maskPhoneBR, normalizePhoneBR } from "@/lib/phone";
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
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const blockNavRef = useRef<HTMLDivElement>(null);

  // Mantém a faixa ativa visível na navegação horizontal (que tem overflow).
  useEffect(() => {
    blockNavRef.current
      ?.querySelector(`[data-block="${block}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [block]);

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

  // WhatsApp é o canal de confirmação do pagamento: só libera a reserva
  // com um número válido (mesma regra do servidor, em tempo real).
  const phoneValid = normalizePhoneBR(buyerPhone) !== null;
  const phoneDigits = buyerPhone.replace(/\D/g, "").length;
  const showPhoneError =
    !phoneValid && buyerPhone !== "" && (phoneTouched || phoneDigits >= 11);
  const nameValid = buyerName.trim().length >= 3;
  const canReserve = selected.length > 0 && nameValid && phoneValid && !pending;

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
                title={`Adicionar ${c} número${c > 1 ? "s" : ""} aleatório${c > 1 ? "s" : ""} à sua seleção`}
                aria-label={`Adicionar ${c} número${c > 1 ? "s" : ""} aleatório${c > 1 ? "s" : ""} à sua seleção`}
                className="flex-1 rounded-xl bg-white px-2 py-2 text-sm font-bold text-grass-700 ring-1 ring-grass-200 transition-colors hover:bg-grass-50 active:bg-grass-100"
              >
                🎲 +{c}
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-[11px] text-stone-500">
          🎲 adiciona números aleatórios à sua seleção
        </p>

        {/* Navegação por blocos de 100: setas + sombras nas bordas deixam
            claro que há mais faixas além das visíveis */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setBlock((b) => Math.max(0, b - 1))}
            disabled={block === 0}
            aria-label="Faixa anterior"
            className="absolute left-0 top-1/2 z-10 flex h-7 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-white text-grass-700 ring-1 ring-grass-200 transition-opacity disabled:opacity-30"
          >
            ‹
          </button>
          <div
            ref={blockNavRef}
            className="flex gap-1 overflow-x-auto px-7 pb-1 [scrollbar-width:none]"
          >
            {BLOCKS.map((b) => (
              <button
                key={b}
                type="button"
                data-block={b}
                onClick={() => setBlock(b)}
                aria-current={block === b}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold tabular transition-colors ${
                  block === b
                    ? "bg-grass-700 text-white"
                    : "bg-white text-grass-700 ring-1 ring-grass-200 hover:bg-grass-50"
                }`}
              >
                {formatNumber(b * 100)}–{formatNumber(b * 100 + 99)}
              </button>
            ))}
          </div>
          {/* Gradientes indicando conteúdo rolável dos dois lados */}
          <div className="pointer-events-none absolute inset-y-0 left-6 w-4 bg-gradient-to-r from-grass-50 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-6 w-4 bg-gradient-to-l from-grass-50 to-transparent" />
          <button
            type="button"
            onClick={() => setBlock((b) => Math.min(BLOCKS.length - 1, b + 1))}
            disabled={block === BLOCKS.length - 1}
            aria-label="Próxima faixa"
            className="absolute right-0 top-1/2 z-10 flex h-7 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-white text-grass-700 ring-1 ring-grass-200 transition-opacity disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      {/* Legenda de cores em destaque */}
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-xs font-medium text-stone-700 ring-1 ring-grass-100 sm:gap-4">
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-md bg-white ring-1 ring-grass-300" />{" "}
          livre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-md bg-stone-200 text-[9px]">
            🔒
          </span>{" "}
          reservado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-md bg-gold-400 text-[9px] font-bold text-gold-900">
            ✓
          </span>{" "}
          pago
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-grass-100 px-2.5 py-0.5 font-bold text-grass-800">
          {availableCount} livres
        </span>
      </div>

      {/* Grade: renderiza SÓ o bloco ativo (100 células); 10 colunas no desktop.
          Células com no mínimo 48px de altura — área de toque confortável. */}
      <div className="mt-3 grid grid-cols-5 gap-1.5 px-4 md:grid-cols-10">
        {Array.from({ length: 100 }, (_, i) => {
          const n = block * 100 + i;
          const status = grid[n];
          const isSelected = selected.includes(n);
          const isSearched = searched === n;
          const statusLabel =
            status === "P"
              ? "pago"
              : status === "R"
                ? "reservado"
                : isSelected
                  ? "selecionado"
                  : "disponível";

          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              disabled={status !== "D"}
              aria-pressed={isSelected}
              aria-label={`Número ${formatNumber(n)}: ${statusLabel}`}
              title={`${formatNumber(n)} · ${statusLabel}`}
              className={`tabular flex min-h-12 items-center justify-center rounded-lg text-sm font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grass-700 focus-visible:ring-offset-1 ${
                isSelected
                  ? "scale-105 bg-grass-600 text-white shadow-md ring-2 ring-grass-700"
                  : status === "P"
                    ? "bg-gold-400 text-gold-900"
                    : status === "R"
                      ? "bg-stone-200 text-stone-600"
                      : "bg-white text-grass-800 ring-1 ring-grass-200 hover:bg-grass-50 active:scale-95 active:bg-grass-100"
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
            {/* Labels visíveis: placeholder some ao digitar e não é rótulo confiável */}
            <div>
              <label
                htmlFor="buyer-name"
                className="mb-1 block text-xs font-semibold text-stone-600"
              >
                Nome completo
              </label>
              <input
                id="buyer-name"
                type="text"
                autoComplete="name"
                placeholder="Ex.: Maria da Silva"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full rounded-xl border border-grass-200 px-3 py-3 text-sm transition-colors focus:border-grass-600 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="buyer-phone"
                className="mb-1 block text-xs font-semibold text-stone-600"
              >
                WhatsApp (com DDD) — usado para confirmar seu pagamento
              </label>
              <input
                id="buyer-phone"
                type="tel"
                autoComplete="tel-national"
                inputMode="numeric"
                maxLength={16}
                placeholder="(11) 91234-5678"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(maskPhoneBR(e.target.value))}
                onBlur={() => setPhoneTouched(true)}
                aria-invalid={showPhoneError}
                aria-describedby={showPhoneError ? "buyer-phone-error" : undefined}
                className={`w-full rounded-xl border px-3 py-3 text-sm transition-colors focus:outline-none ${
                  showPhoneError
                    ? "border-red-400 focus:border-red-500"
                    : phoneValid
                      ? "border-grass-500 focus:border-grass-600"
                      : "border-grass-200 focus:border-grass-600"
                }`}
              />
              {showPhoneError && (
                <p
                  id="buyer-phone-error"
                  className="mt-1 text-xs font-semibold text-red-600"
                >
                  Número incompleto — confira o DDD e o celular, ex.: (11) 91234-5678
                </p>
              )}
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!canReserve}
              className={`w-full rounded-xl py-4 text-center text-base font-extrabold transition-colors ${
                canReserve
                  ? "bg-grass-600 text-white hover:bg-grass-700 active:bg-grass-700"
                  : "cursor-not-allowed bg-stone-200 text-stone-500"
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
