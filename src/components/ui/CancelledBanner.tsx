import { AlertTriangle, MessageCircle } from "lucide-react";
import { CAMPAIGN, buildWhatsAppUrl } from "@/lib/config";

type Props = {
  /** "bar" = tarja fina fixa no topo; "card" = bloco explicativo completo. */
  variant?: "bar" | "card";
};

const CONTACT_MESSAGE =
  `Olá, ${CAMPAIGN.organizerName}! Vi que a rifa do ${CAMPAIGN.childName} foi cancelada. ` +
  `Participei e gostaria de falar sobre a devolução. Minha chave Pix é: `;

/**
 * Tarja de rifa cancelada. Só renderiza quando CAMPAIGN.cancelled = true.
 * A versão "bar" fica no topo de todas as páginas; a "card" explica o
 * motivo e orienta a devolução.
 */
export function CancelledBanner({ variant = "bar" }: Props) {
  if (!CAMPAIGN.cancelled) return null;

  if (variant === "bar") {
    return (
      <div
        role="alert"
        className="sticky top-0 z-40 bg-red-700 px-4 py-2.5 text-center text-white shadow-md"
      >
        <p className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Rifa cancelada
          <span className="hidden font-semibold normal-case tracking-normal sm:inline">
            · Todos os valores pagos serão devolvidos via Pix
          </span>
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-red-300 bg-white p-5 shadow-md">
      <h2 className="flex items-center gap-2 text-xl font-extrabold text-red-700">
        <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
        Rifa cancelada
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-700">
        <p>
          Com o coração apertado, mas com muita gratidão, informamos que a
          rifa do {CAMPAIGN.childName} foi{" "}
          <strong>cancelada em {CAMPAIGN.cancelledAtLabel}</strong>.
        </p>
        <p>{CAMPAIGN.cancelledReason}</p>
        <p>
          Como prometido na nossa garantia,{" "}
          <strong>
            todos os valores pagos serão devolvidos de forma integral
          </strong>
          , via Pix. Se você pagou algum número, envie sua chave Pix e o nome
          do titular pelo WhatsApp. A devolução é feita{" "}
          {CAMPAIGN.refundDeadlineLabel}, com envio do comprovante.
        </p>
        <p>
          Obrigado de verdade a cada pessoa que participou, compartilhou ou
          torceu. O sonho do {CAMPAIGN.childName} continua, só vai mudar o
          caminho.
        </p>
      </div>
      <a
        href={buildWhatsAppUrl(CONTACT_MESSAGE)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-whatsapp py-3.5 text-center text-base font-extrabold text-white transition-colors hover:bg-whatsapp-dark active:bg-whatsapp-dark"
      >
        <MessageCircle className="h-5 w-5" aria-hidden /> PEDIR MINHA DEVOLUÇÃO
        NO WHATSAPP
      </a>
      <p className="mt-2 text-center text-xs text-stone-500">
        Organizado por {CAMPAIGN.organizerName}. No Pix de devolução, o
        pagador será sempre <strong>{CAMPAIGN.pixHolderName}</strong>.
      </p>
    </section>
  );
}
