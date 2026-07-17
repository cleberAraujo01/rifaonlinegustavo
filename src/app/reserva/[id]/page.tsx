import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CheckCircle2,
  Clock,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import {
  CAMPAIGN,
  buildReservationMessage,
  buildWhatsAppUrl,
  formatBRL,
  formatNumber,
} from "@/lib/config";
import { getOrderWithNumbers } from "@/db/queries";
import { PixCopyField } from "@/components/ui/PixCopyField";
import { Deadline } from "@/components/ui/Deadline";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Sua reserva · Rifa do ${CAMPAIGN.childName}`,
  robots: { index: false },
  // Cartão de pré-visualização do link-comprovante enviado no WhatsApp
  openGraph: {
    title: `Comprovante · Rifa do ${CAMPAIGN.childName}`,
    description: `Seus números da sorte na rifa solidária do ${CAMPAIGN.childName}. Sorteio pela Loteria Federal.`,
    images: [
      {
        url: "/images/og-gustavo.jpg",
        alt: `Foto do ${CAMPAIGN.childName} jogando futsal`,
      },
    ],
  },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReservaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const data = await getOrderWithNumbers(id).catch(() => null);
  if (!data) notFound();

  const { order, numbers } = data;
  const isPaid = order.status === "paid";
  const isExpired =
    order.status === "cancelled" ||
    (order.status === "reserved" && order.reservedUntil.getTime() < Date.now());

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-10">
      <header className="py-6 text-center">
        {isPaid ? (
          <>
            <CheckCircle2
              className="mx-auto h-12 w-12 text-grass-600"
              aria-hidden
            />
            <h1 className="mt-2 text-2xl font-extrabold text-grass-900">
              Pagamento confirmado!
            </h1>
            <p className="mt-1 text-stone-600">
              Boa sorte no sorteio, {order.buyerName.split(" ")[0]}!
            </p>
          </>
        ) : isExpired ? (
          <>
            <Clock className="mx-auto h-12 w-12 text-red-400" aria-hidden />
            <h1 className="mt-2 text-2xl font-extrabold text-red-700">
              Reserva expirada
            </h1>
            <p className="mt-1 text-stone-600">
              O prazo de pagamento passou e os números voltaram para a grade.
            </p>
          </>
        ) : (
          <>
            <TicketCheck
              className="mx-auto h-12 w-12 text-grass-600"
              aria-hidden
            />
            <h1 className="mt-2 text-2xl font-extrabold text-grass-900">
              Números reservados!
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Pague até <Deadline iso={order.reservedUntil.toISOString()} /> ou
              eles voltam a ficar livres.
            </p>
          </>
        )}
      </header>

      {/* Números */}
      <div className="flex flex-wrap justify-center gap-2">
        {numbers.map((n) => (
          <span
            key={n}
            className={`tabular rounded-xl px-4 py-2 text-lg font-extrabold ${
              isPaid
                ? "bg-gold-400 text-gold-700"
                : "bg-grass-100 text-grass-800"
            }`}
          >
            {formatNumber(n)}
          </span>
        ))}
      </div>

      {!isPaid && !isExpired && (
        <div className="mt-8 space-y-6">
          {/* Passo 1: Pix */}
          <section>
            <h2 className="mb-2 font-extrabold text-grass-900">
              1. Pague {formatBRL(order.totalCents)} no Pix
            </h2>
            <PixCopyField
              pixKey={CAMPAIGN.pixKey}
              pixKeyType={CAMPAIGN.pixKeyType}
            />
            {/* Anti-golpe: o app do banco sempre mostra o favorecido antes de
                confirmar — é o ponto de verificação contra sites clonados */}
            <div className="mt-2 rounded-xl border-2 border-gold-500 bg-gold-100/70 px-3 py-3">
              <p className="flex items-center gap-1.5 text-base font-extrabold text-grass-900">
                <ShieldCheck
                  className="h-5 w-5 shrink-0 text-grass-700"
                  aria-hidden
                />
                Favorecido: {CAMPAIGN.pixHolderName}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
                Antes de confirmar o Pix, confira no app do seu banco se o
                favorecido é <strong>{CAMPAIGN.pixHolderName}</strong>. Nome
                diferente? <strong className="text-red-700">Não pague.</strong>{" "}
                Você pode estar em um site falso. O único site oficial é{" "}
                <strong>{CAMPAIGN.siteUrl.replace("https://", "")}</strong>.
              </p>
            </div>
            <p className="mt-2 rounded-lg bg-gold-100 px-3 py-2 text-xs text-gold-700">
              Se a rifa não for totalmente vendida até a data do sorteio,
              você recebe <strong>100% do valor de volta</strong> via Pix.
            </p>
          </section>

          {/* Passo 2: comprovante */}
          <section>
            <h2 className="mb-2 font-extrabold text-grass-900">
              2. Envie o comprovante no WhatsApp
            </h2>
            <a
              href={buildWhatsAppUrl(
                buildReservationMessage(numbers, order.buyerName),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-whatsapp py-4 text-center text-base font-extrabold text-white active:bg-whatsapp-dark"
            >
              <MessageCircle className="h-5 w-5" aria-hidden /> ENVIAR
              COMPROVANTE
            </a>
            <p className="mt-2 text-center text-xs text-stone-500">
              A mensagem já vai pronta com seus números. Após a confirmação,
              seus números ficam dourados na grade.
            </p>
          </section>
        </div>
      )}

      {isExpired && (
        <div className="mt-8">
          <Link
            href="/numeros"
            className="block rounded-xl bg-grass-600 py-4 text-center text-base font-extrabold text-white active:bg-grass-700"
          >
            ESCOLHER NÚMEROS DE NOVO →
          </Link>
        </div>
      )}

      {/* Convite para o grupo de avisos: momento ideal — a pessoa acabou de
          reservar/pagar e quer acompanhar o sorteio */}
      {!isExpired && CAMPAIGN.whatsappGroupUrl && (
        <a
          href={CAMPAIGN.whatsappGroupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-grass-100 transition-colors hover:bg-grass-50 active:bg-grass-100"
        >
          <Megaphone className="h-6 w-6 shrink-0 text-whatsapp" aria-hidden />
          <span className="flex-1">
            <span className="block text-sm font-extrabold text-grass-900">
              Entre no grupo da rifa no WhatsApp
            </span>
            <span className="block text-xs text-stone-500">
              Acompanhe o progresso da meta e fique por dentro do sorteio
            </span>
          </span>
          <span className="font-bold text-whatsapp" aria-hidden>
            →
          </span>
        </a>
      )}

      <p className="mt-10 text-center text-sm">
        <Link href="/" className="text-grass-700 underline">
          ← Voltar para a página da rifa
        </Link>
      </p>
    </main>
  );
}
