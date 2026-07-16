import Link from "next/link";
import { CAMPAIGN, formatBRL } from "@/lib/config";
import { ProgressBar } from "@/components/landing/ProgressBar";
import { StickyHeader } from "@/components/landing/StickyHeader";
import { StickyCtaBar } from "@/components/landing/StickyCtaBar";
import { SmartImage } from "@/components/ui/SmartImage";
import { getGridStateSafe } from "@/db/queries";

// Landing revalida a cada 60s: abre instantânea e o progresso fica quase em tempo real.
export const revalidate = 60;

const steps = [
  { emoji: "1️⃣", title: "Escolha seus números", text: `Na grade de 000 a ${CAMPAIGN.totalNumbers - 1}, quantos quiser.` },
  { emoji: "2️⃣", title: "Reserve com nome e WhatsApp", text: "Sem cadastro, sem senha. Leva 30 segundos." },
  { emoji: "3️⃣", title: "Pague pelo Pix", text: `${formatBRL(CAMPAIGN.pricePerNumberCents)} por número, na chave exibida na tela.` },
  { emoji: "4️⃣", title: "Envie o comprovante", text: "Direto no WhatsApp, com mensagem já pronta. Confirmado = número garantido." },
];

export default async function Home() {
  const stats = await getGridStateSafe();
  const drawDateLabel = CAMPAIGN.drawDate
    ? new Date(CAMPAIGN.drawDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    : "em breve";

  const goalPct = Math.min(
    100,
    Math.round((stats.raisedCents / CAMPAIGN.goalCents) * 100),
  );

  return (
    <main className="flex-1 pb-24">
      <StickyHeader pct={goalPct} />

      {/* Hero: coluna única no mobile, texto + foto lado a lado no desktop */}
      <header className="bg-grass-900 px-5 pb-8 pt-10 text-white">
        <div className="mx-auto w-full max-w-lg md:grid md:max-w-5xl md:grid-cols-2 md:items-center md:gap-10">
          <div className="text-center md:text-left">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gold-400">
              Rifa solidária ⚽
            </p>
            <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
              Ajude o {CAMPAIGN.childName} a jogar futebol em Portugal
            </h1>
            <p className="mt-3 text-grass-100">
              Cada número vendido é um passo rumo aos testes nos clubes portugueses.
            </p>

            <Link
              id="hero-cta"
              href="/numeros"
              className="mt-5 block rounded-xl bg-gold-500 px-8 py-3.5 text-center text-base font-extrabold text-grass-950 shadow-lg transition-colors hover:bg-gold-400 active:bg-gold-600 md:inline-block"
            >
              QUERO AJUDAR — ESCOLHER NÚMEROS →
            </Link>
          </div>

          {/* Foto do Gustavo em ação: public/images/hero.jpg */}
          <div className="relative mt-6 h-64 overflow-hidden rounded-2xl sm:h-80 md:mt-0 md:h-96">
            <SmartImage
              src="/images/hero.jpg"
              alt={`${CAMPAIGN.childName} em ação durante uma partida de futebol`}
              className="h-full w-full"
              imgClassName="object-center"
              priority
              sizes="(max-width: 768px) 100vw, 480px"
              fallback={
                <div className="flex h-full items-center justify-center bg-grass-800 text-6xl">
                  ⚽
                </div>
              }
            />
            {/* Gradiente para legibilidade de texto sobre a foto */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </div>
      </header>

      {/* Conteúdo: 1 coluna no mobile; no desktop, história à esquerda e
          cartões de conversão (prêmio/preço/meta) à direita, fixos na rolagem */}
      <div className="mx-auto w-full max-w-lg px-4 md:grid md:max-w-5xl md:grid-cols-5 md:items-start md:gap-8 md:px-6">
        {/* Coluna de conversão */}
        {/* top-16 = folga para o cabeçalho sticky não cobrir os cartões */}
        <div className="-mt-5 space-y-4 md:sticky md:top-16 md:order-2 md:col-span-2 md:mt-8">
          {/* Cartão do prêmio: largura total, imagem grande e legenda destacada */}
          <section className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-grass-100">
            <div className="rounded-xl bg-gold-100/70 p-3">
              <SmartImage
                src="/images/bike.webp"
                alt={`Prêmio da rifa: ${CAMPAIGN.prize} (imagem ilustrativa)`}
                className="h-[260px] w-full rounded-lg bg-white"
                fit="contain"
                sizes="(max-width: 768px) 100vw, 400px"
              />
              <div className="mt-3 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gold-800">
                  Prêmio 🚴
                </p>
                <p className="text-xl font-extrabold text-gold-800">
                  {CAMPAIGN.prize}
                </p>
                <p className="mt-1 text-[11px] text-stone-400">
                  imagem ilustrativa
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 items-stretch gap-3 text-center">
              <div className="flex flex-col justify-center rounded-xl bg-grass-50 p-3">
                <p className="text-xs text-stone-500">Cada número</p>
                <p className="text-xl font-extrabold text-grass-800">
                  {formatBRL(CAMPAIGN.pricePerNumberCents)}
                </p>
              </div>
              {/* Selo de confiança do sorteio */}
              <div className="flex flex-col justify-center rounded-xl bg-grass-50 p-3">
                <p className="text-xs text-stone-500">📅 Sorteio {drawDateLabel}</p>
                <p className="text-sm font-extrabold text-grass-800">
                  Loteria Federal
                </p>
              </div>
            </div>
          </section>

          {/* Progresso da meta */}
          <section>
            <ProgressBar {...stats} />
          </section>
        </div>

        {/* Coluna de história */}
        <div className="md:order-1 md:col-span-3">
          {/* Conheça o Gustavo */}
          <section className="mt-8">
            <h2 className="mb-4 text-xl font-extrabold text-grass-900">
              Conheça o {CAMPAIGN.childName}
            </h2>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-grass-100 sm:flex sm:gap-4">
              {/* Foto dele sorrindo fora de campo: public/images/gustavo.jpg */}
              <SmartImage
                src="/images/gustavo.jpg"
                alt={`${CAMPAIGN.childName} sorrindo`}
                className="mb-3 h-44 w-full shrink-0 rounded-xl sm:mb-0 sm:h-auto sm:w-40"
                sizes="(max-width: 640px) 100vw, 160px"
              />
              <div className="space-y-3 text-sm leading-relaxed text-stone-700">
                <p>
                  O {CAMPAIGN.childName} é um <strong>guerreiro desde o primeiro
                  dia de vida</strong>. Ele nasceu enfrentando uma batalha intensa —
                  e venceu, mostrando desde cedo uma força que impressiona todo
                  mundo à sua volta.
                </p>
                <p>
                  Foi no futebol que essa garra encontrou o seu lugar. Bola no pé,
                  disciplina nos treinos e um sonho grande: viver do esporte que
                  ele ama.
                </p>
                <p>
                  Agora chegou a oportunidade da vida dele:{" "}
                  <strong>fazer testes em clubes de futebol de Portugal</strong>.
                  Cada número desta rifa ajuda a pagar a viagem — e você ainda
                  concorre a uma {CAMPAIGN.prize.toLowerCase()}. 💚
                </p>
              </div>
            </div>
          </section>

          {/* Como funciona */}
          <section className="mt-8">
            <h2 className="mb-4 text-xl font-extrabold text-grass-900">
              Como funciona
            </h2>
            <ol className="space-y-3">
              {steps.map((s) => (
                <li
                  key={s.title}
                  className="flex gap-3 rounded-xl bg-white p-4 ring-1 ring-grass-100"
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <div>
                    <p className="font-bold text-grass-900">{s.title}</p>
                    <p className="text-sm text-stone-600">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Regra do sorteio */}
          <section className="mt-8">
            <div className="rounded-2xl bg-grass-900 p-5 text-white">
              <h2 className="mb-2 text-lg font-extrabold text-gold-400">
                🎲 Sorteio 100% auditável
              </h2>
              <p className="text-sm leading-relaxed text-grass-100">
                {CAMPAIGN.drawRule} Ninguém controla o resultado — nem a gente.
              </p>
            </div>
          </section>

          {/* Garantia de devolução */}
          <section className="mt-4">
            <div className="rounded-2xl border-2 border-gold-400 bg-white p-5">
              <h2 className="mb-2 text-lg font-extrabold text-grass-900">
                🛡️ Garantia de devolução
              </h2>
              <p className="text-sm leading-relaxed text-stone-700">
                Se a rifa não for vendida por completo até a data do sorteio,{" "}
                <strong>
                  todos os valores pagos serão devolvidos de forma integral
                </strong>
                , via Pix, para cada comprador. Risco zero para quem apoia.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Transparência */}
      <section className="mx-auto mt-8 max-w-lg px-4 text-center text-sm text-stone-500 md:max-w-5xl md:px-6">
        <p>
          Meta de {formatBRL(CAMPAIGN.goalCents)} para custear a viagem e os
          testes em Portugal. São {CAMPAIGN.totalNumbers} números — vendendo
          todos, a arrecadação chega a{" "}
          {formatBRL(CAMPAIGN.totalNumbers * CAMPAIGN.pricePerNumberCents)}.
        </p>
        <p className="mt-1">
          Organizado por {CAMPAIGN.organizerName} · Dúvidas? Chama no WhatsApp.
        </p>
      </section>

      {/* CTA fixo: só aparece quando o CTA do herói sai da tela (um CTA dominante por vez) */}
      <StickyCtaBar
        href="/numeros"
        label="ESCOLHER MEUS NÚMEROS →"
        watchId="hero-cta"
      />
    </main>
  );
}
