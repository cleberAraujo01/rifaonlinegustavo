/**
 * Configuração central da campanha.
 * Tudo que é "regra de negócio editável" mora aqui — um único lugar para ajustar.
 */
export const CAMPAIGN = {
  childName: "Gustavo",
  organizerName: "Cleber Araujo",

  totalNumbers: 700, // 000 a 699
  pricePerNumberCents: 4000, // R$ 40,00
  goalCents: 2500000, // R$ 25.000,00 (vendendo 625 números; venda total = R$ 28.000)

  prize: "Bicicleta elétrica 0 km",
  prizeValueLabel: "R$ 4.500",

  // TODO: definir a data real do sorteio (formato ISO). Enquanto null, a UI mostra "em breve".
  drawDate: null as string | null,
  drawRule:
    "O número sorteado será formado pelos 3 últimos dígitos do 1º prêmio da Loteria Federal. " +
    "Se sair acima de 699, vale o 2º prêmio; se também passar, o 3º — e assim por diante. " +
    "Regra clara e sempre com ganhador.",

  pixKey: "11975636037",
  pixKeyType: "Telefone",
  whatsappPhone: "5511975636037", // formato internacional, só dígitos

  reservationHours: 6,
  maxNumbersPerOrder: 20,
} as const;

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** 7 -> "007" */
export function formatNumber(n: number): string {
  return n.toString().padStart(3, "0");
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${CAMPAIGN.whatsappPhone}?text=${encodeURIComponent(message)}`;
}

export function buildReservationMessage(
  numbers: number[],
  buyerName: string,
): string {
  const nums = numbers.map(formatNumber).join(", ");
  const total = formatBRL(numbers.length * CAMPAIGN.pricePerNumberCents);
  return (
    `Oi! Reservei o(s) número(s) ${nums} na rifa solidária do ${CAMPAIGN.childName}, ` +
    `no nome de ${buyerName}. Total: ${total}. Segue o comprovante do Pix:`
  );
}
