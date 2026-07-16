"use client";

import { useRef, useState } from "react";

type Props = {
  /** Caminho do vídeo em public/ (ex.: /videos/gustavo.mp4). */
  src: string;
  /** Imagem de capa exibida antes do play (facade — o vídeo só carrega ao tocar). */
  poster?: string;
  /** Descrição para acessibilidade. */
  label: string;
};

/**
 * Player leve com padrão "facade": a página renderiza só a capa + botão ▶
 * (zero bytes de vídeo); o <video> nasce com preload="none" e o download
 * começa apenas quando o visitante decide assistir. Crítico para a landing
 * continuar instantânea no 4G.
 */
export function CampaignVideo({ src, poster, label }: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        // Sem capa própria, "metadata" busca só o primeiro quadro (~centenas
        // de KB) para não exibir um retângulo preto; com capa, nada é baixado.
        preload={poster ? "none" : "metadata"}
        controls={playing}
        playsInline
        aria-label={label}
        className="max-h-[480px] w-full object-contain"
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            videoRef.current?.play();
          }}
          aria-label={`Assistir: ${label}`}
          className="group absolute inset-0 flex items-center justify-center"
        >
          {/* Escurece levemente a capa para o play saltar aos olhos */}
          <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-2xl text-grass-950 shadow-lg transition-transform group-hover:scale-110 group-active:scale-95">
            ▶
          </span>
        </button>
      )}
    </div>
  );
}
