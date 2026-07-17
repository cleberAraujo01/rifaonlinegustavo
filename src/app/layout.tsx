import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CAMPAIGN, formatBRL } from "@/lib/config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const title = `Rifa Solidária do ${CAMPAIGN.childName} ⚽`;
const description =
  `Ajude o ${CAMPAIGN.childName} a realizar o sonho de jogar futebol em Portugal. ` +
  `Números a ${formatBRL(CAMPAIGN.pricePerNumberCents)} — prêmio: ${CAMPAIGN.prize}. ` +
  `Sorteio pela Loteria Federal.`;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "pt_BR",
    // Foto do Gustavo no cartão de pré-visualização (WhatsApp, redes sociais)
    images: [{ url: "/images/og-gustavo.jpg", alt: `Foto do ${CAMPAIGN.childName} jogando futsal` }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
