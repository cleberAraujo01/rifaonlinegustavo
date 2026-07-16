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
  // Painel inferior: começa compacto (só resumo) para não cobrir a grade;
  // o formulário abre quando o comprador decide reservar.
  const [expanded, setExpanded] = useState(false);
  // Feedback efêmero: toast de aviso e chips recém-adicionados piscando.
  const [toast, setToast] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<number[]>([]);
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const blockNavRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  function flashChips(ids: number[]) {
    setFlashIds(ids);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashIds([]), 1600);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // Ao expandir o formulário, leva o foco direto para o primeiro campo.
  useEffect(() => {
    if (expanded) nameInputRef.current?.focus();
  }, [expanded]);

  // Sem seleção não há painel — a próxima seleção volta compacta.
  useEffect(() => {
    if (selected.length === 0) setExpanded(false);
  }, [selected.length]);

  // Mantém a faixa ativa visível na navegação horizontal (que tem overflow).
  useEffect(() => {
    blockNavRef.current
      ?.querySelector(`[data-block="${block}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [block]);

  // Polling: mantém a grade fresca sem recarregar a página.
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const timer = setInterval(async () => {
      setRefreshing(true);
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
      } finally {
        setRefreshing(false);
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
    if (selected.includes(n)) {
      setSelected((prev) => prev.filter((x) => x !== n));
      return;
    }
    if (selected.length >= CAMPAIGN.maxNumbersPerOrder) {
      showToast(`Máximo de ${CAMPAIGN.maxNumbersPerOrder} números por reserva`);
      return;
    }
    setSelected((prev) => [...prev, n]);
    setLastAdded(n);
  }

  function pickRandom(count: number) {
    const pool: number[] = [];
    for (let n = 0; n < CAMPAIGN.totalNumbers; n++) {
      if (grid[n] === "D" && !selected.includes(n)) pool.push(n);
    }
    const room = CAMPAIGN.maxNumbersPerOrder - selected.length;
    if (room <= 0) {
      showToast(`Máximo de ${CAMPAIGN.maxNumbersPerOrder} números por reserva`);
      return;
    }
    const picked: number[] = [];
    for (let i = 0; i < Math.min(count, room, pool.length); i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    if (picked.length > 0) {
      setSelected((prev) => [...prev, ...picked]);
      setBlock(Math.floor(picked[0] / 100));
      // Os sorteados podem cair em faixas fora da tela: o toast + os chips
      // piscando no painel confirmam que a ação funcionou.
      showToast(
        picked.length === 1
          ? "🎲 1 número adicionado à sua seleção!"
          : `🎲 ${picked.length} números adicionados à sua seleção!` +
              (picked.length < count ? ` (limite de ${CAMPAIGN.maxNumbersPerOrder})` : ""),
      );
      flashChips(picked);
    }
  }

  const searchInvalid =
    search !== "" &&
    (Number.isNaN(parseInt(search, 10)) || parseInt(search, 10) > MAX_N);

  function goToSearch(value: string) {
    setSearch(value);
    const n = parseInt(value, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= MAX_N) {
      setBlock(Math.floor(n / 100));
    } else if (value !== "" && !Number.isNaN(n)) {
      showToast(`O ${value} não existe — os números vão de 000 a ${MAX_N} 😉`);
    }
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
      {/* Toast de feedback (aleatórios, limites, avisos) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="animate-toast-in fixed left-1/2 top-44 z-40 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-grass-800 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}

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
            aria-invalid={searchInvalid}
            aria-label={`Buscar número de 000 a ${MAX_N}`}
            className={`w-28 rounded-xl border bg-white px-3 py-2 text-sm tabular transition-colors focus:outline-none ${
              searchInvalid
                ? "border-red-400 focus:border-red-500"
                : "border-grass-200 focus:border-grass-600"
            }`}
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
            className="absolute left-0 top-1/2 z-10 flex h-8 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-white text-base font-bold text-grass-700 shadow-md ring-1 ring-grass-200 transition-all hover:bg-grass-50 disabled:opacity-30 disabled:shadow-none"
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
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold tabular transition-all ${
                  block === b
                    ? "scale-105 bg-grass-700 text-white shadow-md ring-2 ring-grass-700 ring-offset-1"
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
            className="absolute right-0 top-1/2 z-10 flex h-8 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-white text-base font-bold text-grass-700 shadow-md ring-1 ring-grass-200 transition-all hover:bg-grass-50 disabled:opacity-30 disabled:shadow-none"
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
        <span
          className={`ml-auto shrink-0 rounded-full bg-grass-100 px-2.5 py-0.5 font-bold text-grass-800 ${
            refreshing ? "animate-pulse" : ""
          }`}
          title={refreshing ? "Atualizando disponibilidade…" : undefined}
        >
          {availableCount} livres
        </span>
      </div>

      {/* Prova social + escassez: some enquanto ninguém garantiu número */}
      {CAMPAIGN.totalNumbers - availableCount > 0 && (
        <p className="mx-4 mt-2 rounded-lg bg-gold-100/70 px-3 py-1.5 text-center text-xs font-bold text-gold-800">
          🎟️ Já garantidos: {CAMPAIGN.totalNumbers - availableCount} de{" "}
          {CAMPAIGN.totalNumbers} · restam {availableCount}
        </p>
      )}

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
              onClick={() =>
                status === "D"
                  ? toggle(n)
                  : showToast(
                      `O ${formatNumber(n)} já foi escolhido${
                        status === "P" ? " e pago" : ""
                      } — que tal outro? 😉`,
                    )
              }
              aria-disabled={status !== "D"}
              aria-pressed={isSelected}
              aria-label={`Número ${formatNumber(n)}: ${statusLabel}`}
              title={`${formatNumber(n)} · ${statusLabel}`}
              className={`tabular flex min-h-12 items-center justify-center rounded-lg text-sm font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grass-700 focus-visible:ring-offset-1 ${
                isSelected
                  ? `scale-105 bg-grass-600 text-white shadow-md ring-2 ring-grass-700 ${n === lastAdded ? "animate-pop" : ""}`
                  : status === "P"
                    ? "cursor-default bg-gold-400 text-gold-900"
                    : status === "R"
                      ? "cursor-default bg-stone-200 text-stone-600"
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
              {/* key remonta o span a cada mudança → replay da animação */}
              <span
                key={selected.length}
                className="animate-pop font-bold text-grass-900 tabular"
              >
                {selected.length} número{selected.length > 1 ? "s" : ""} ·{" "}
                {formatBRL(totalCents)}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-stone-400 underline"
                >
                  limpar
                </button>
                {expanded && (
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    aria-expanded={expanded}
                    aria-label="Recolher formulário e continuar escolhendo números"
                    className="rounded-lg px-2 py-1 text-xs font-bold text-grass-700 ring-1 ring-grass-200 transition-colors hover:bg-grass-50"
                  >
                    ⌄ continuar escolhendo
                  </button>
                )}
              </div>
            </div>

            {/* Chips: uma linha compacta quando recolhido, quebra quando expandido */}
            <div
              className={
                expanded
                  ? "flex max-h-16 flex-wrap gap-1 overflow-y-auto"
                  : "flex gap-1 overflow-x-auto pb-0.5"
              }
            >
              {[...selected]
                .sort((a, b) => a - b)
                .map((n) => (
                  <span
                    key={n}
                    className={`flex shrink-0 items-stretch overflow-hidden rounded-md bg-grass-100 text-xs font-bold text-grass-800 ${
                      flashIds.includes(n) ? "animate-chip-flash" : ""
                    }`}
                  >
                    {/* Número navega até a faixa dele na grade */}
                    <button
                      type="button"
                      onClick={() => setBlock(Math.floor(n / 100))}
                      title={`Ver o ${formatNumber(n)} na grade`}
                      aria-label={`Ir para a faixa do número ${formatNumber(n)}`}
                      className="tabular py-1 pl-2 pr-1 transition-colors hover:bg-grass-200"
                    >
                      {formatNumber(n)}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(n)}
                      aria-label={`Remover o número ${formatNumber(n)} da seleção`}
                      className="px-1.5 py-1 text-grass-700 transition-colors hover:bg-red-100 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>

            {/* Recolhido: só o resumo + botão para abrir o formulário,
                deixando a grade livre para continuar selecionando */}
            {!expanded && (
              <>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="w-full rounded-xl bg-grass-600 py-4 text-center text-base font-extrabold text-white transition-colors hover:bg-grass-700 active:bg-grass-700"
                >
                  RESERVAR {selected.length} NÚMERO
                  {selected.length > 1 ? "S" : ""} →
                </button>
                <p className="text-center text-xs text-stone-400">
                  Continue escolhendo na grade — seus números ficam guardados aqui
                </p>
              </>
            )}

            {expanded && (
              <>
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
                ref={nameInputRef}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
