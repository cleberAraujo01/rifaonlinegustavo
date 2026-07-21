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

  // 1º prêmio, usado nos textos gerais e na imagem do cartão
  prize: "Bicicleta elétrica 0 km",
  prizeValueLabel: "R$ 4.500",

  // Os três prêmios saem da MESMA extração da Loteria Federal, que sorteia
  // 5 bilhetes no mesmo dia. Cada prêmio da rifa usa os 3 últimos dígitos
  // do prêmio correspondente da Loteria Federal.
  prizes: [
    {
      label: "1º prêmio",
      title: "Bicicleta elétrica 0 km",
      short: "bicicleta",
      source: "3 últimos dígitos do 1º prêmio da Loteria Federal",
    },
    {
      label: "2º prêmio",
      title: "R$ 1.000,00 via Pix",
      short: "R$ 1.000",
      source: "3 últimos dígitos do 2º prêmio da Loteria Federal",
    },
    {
      label: "3º prêmio",
      title: "R$ 500,00 via Pix",
      short: "R$ 500",
      source: "3 últimos dígitos do 3º prêmio da Loteria Federal",
    },
  ],

  drawDate: "2026-11-07" as string | null,
  drawDateLabel: "07/11/2026",
  drawLotteryLabel: "2º sorteio da Loteria Federal de novembro",
  drawRule:
    "Os três prêmios são definidos na mesma extração da Loteria Federal, que sorteia 5 bilhetes no mesmo dia. " +
    "O número ganhador de cada prêmio é formado pelos 3 últimos dígitos:",
  drawRuleAdjust:
    "Se algum número sair acima de 699 (fora da faixa 000 a 699), usa-se o próximo prêmio da Loteria Federal (o 4º e depois o 5º), sempre garantindo um ganhador. " +
    "Se o mesmo número se repetir entre os prêmios, passa-se ao próximo prêmio da Loteria Federal para desempatar, garantindo três ganhadores diferentes.",

  pixKey: "11975636037",
  pixKeyType: "Telefone",
  // Nome completo como aparece no app do banco na hora do Pix — é o que o
  // comprador confere para se proteger de sites clonados.
  pixHolderName: "Cleber Lopes da Silva Araujo",
  whatsappPhone: "5511975636037", // formato internacional, só dígitos

  // URL pública canônica do site (usada em links enviados por WhatsApp,
  // que precisam funcionar mesmo quando gerados no ambiente local)
  siteUrl: "https://rifaonlinegustavo.vercel.app",

  // Grupo de divulgação "Rifa do Gustavo" (avisos, progresso e resultado do
  // sorteio — comprovantes continuam no 1:1). null = esconde os botões.
  whatsappGroupUrl: "https://chat.whatsapp.com/G7WnWBtSDRh4vQACtY4ua1" as
    | string
    | null,

  reservationHours: 24 * 7, // 1 semana para pagar; depois a reserva expira sozinha
  reservationLabel: "1 semana", // como o prazo aparece nos textos do site
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

/**
 * Cobrança gentil de uma reserva pendente (usada no botão "Cobrar" e na
 * cobrança em massa do painel). Sem emojis — ver aviso abaixo.
 */
export function buildChargeMessage(
  numbers: number[],
  buyerName: string,
): string {
  const firstName = buyerName.trim().split(/\s+/)[0];
  const plural = numbers.length > 1;
  const nums = numbers.map(formatNumber).join(", ");
  const total = formatBRL(numbers.length * CAMPAIGN.pricePerNumberCents);
  return (
    `Olá, ${firstName}, tudo bem? ${CAMPAIGN.organizerName} por aqui, da rifa do ${CAMPAIGN.childName}!\n\n` +
    `Tô passando rapidinho para te lembrar do${plural ? "s" : ""} número${plural ? "s" : ""} *${nums}*, ` +
    `que segue${plural ? "m" : ""} reservado${plural ? "s" : ""} para você. ` +
    `Como as reservas sem pagamento são liberadas depois de um tempo para manter tudo organizado, ` +
    `quis te avisar antes para você não perder o${plural ? "s" : ""} seu${plural ? "s" : ""}!\n\n` +
    `*Valor:* ${total}\n` +
    `*Chave Pix (${CAMPAIGN.pixKeyType}):* ${CAMPAIGN.pixKey}\n` +
    `*Nome:* ${CAMPAIGN.pixHolderName}\n\n` +
    `Assim que fizer o pagamento, me envia o comprovante por aqui que eu já confirmo ` +
    `seu${plural ? "s" : ""} número${plural ? "s" : ""}. Qualquer dúvida, estou à disposição. Obrigado pelo apoio!`
  );
}

/** Reconvite para quem deixou a reserva expirar sem pagar. Sem emojis. */
export function buildReinviteMessage(buyerName: string): string {
  const firstName = buyerName.trim().split(/\s+/)[0];
  return (
    `Oi, ${firstName}! Aqui é o ${CAMPAIGN.organizerName}, da rifa solidária do ${CAMPAIGN.childName}. ` +
    `Sua reserva expirou antes do pagamento, mas ainda dá tempo de participar: ` +
    `escolha seus números de novo em ${CAMPAIGN.siteUrl}/numeros (agora o prazo de pagamento é de ${CAMPAIGN.reservationLabel}). ` +
    `Obrigado por apoiar!`
  );
}

/**
 * Mensagem de agradecimento que o organizador envia ao comprador após
 * confirmar o pagamento no painel. O link do pedido serve de comprovante
 * permanente (auditável) com os números dourados na tela.
 *
 * ⚠️ Sem emojis de propósito: o WhatsApp Desktop no Windows corrompe
 * emojis recebidos via link wa.me?text=... (viram "�").
 */
export function buildConfirmationMessage(
  numbers: number[],
  buyerName: string,
  orderUrl: string,
): string {
  const firstName = buyerName.trim().split(/\s+/)[0];
  const plural = numbers.length > 1;
  const nums = numbers.map(formatNumber).join(", ");
  const total = formatBRL(numbers.length * CAMPAIGN.pricePerNumberCents);
  return (
    `*Pagamento confirmado, ${firstName}!*\n\n` +
    `Seu${plural ? "s" : ""} número${plural ? "s" : ""} da sorte na Rifa do ${CAMPAIGN.childName}: *${nums}*\n` +
    `Valor: ${total}\n\n` +
    `Seu comprovante permanente:\n${orderUrl}\n\n` +
    `Muito obrigado por fazer parte desse sonho! Boa sorte no sorteio!`
  );
}
