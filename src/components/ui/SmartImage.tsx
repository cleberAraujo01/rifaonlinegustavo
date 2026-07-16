"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type Props = {
  src: string;
  alt: string;
  /** Classes do contêiner (defina altura/largura aqui). */
  className?: string;
  /** Como a imagem preenche a caixa: cover corta, contain mostra inteira. */
  fit?: "cover" | "contain";
  /** Classes extras da imagem (ex.: object-top). */
  imgClassName?: string;
  /** O que renderizar se a foto ainda não existir em public/. */
  fallback?: ReactNode;
  /** Selo sobreposto no canto da imagem (ex.: "imagem ilustrativa"). */
  badge?: string;
  priority?: boolean;
  sizes?: string;
};

/**
 * Imagem com fallback: se o arquivo não existir (404), renderiza o fallback.
 * Permite subir o site antes das fotos reais chegarem — basta colocar os
 * arquivos em public/images/ com os nomes esperados, sem tocar no código.
 */
export function SmartImage({
  src,
  alt,
  className,
  fit = "cover",
  imgClassName,
  fallback = null,
  badge,
  priority,
  sizes,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes ?? "(max-width: 640px) 100vw, 640px"}
        className={`${fit === "contain" ? "object-contain" : "object-cover"} ${imgClassName ?? ""}`}
        onError={() => setFailed(true)}
      />
      {badge && (
        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {badge}
        </span>
      )}
    </div>
  );
}
