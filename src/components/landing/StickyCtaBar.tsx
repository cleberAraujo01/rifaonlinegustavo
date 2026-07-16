"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  href: string;
  label: string;
  /** id do CTA principal da página: enquanto ele estiver visível, esta barra some. */
  watchId: string;
};

/**
 * CTA fixo no rodapé que só aparece depois que o CTA do herói sai da tela.
 * Garante um único call-to-action dominante por vez, sem dividir a atenção.
 */
export function StickyCtaBar({ href, label, watchId }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    // Sem alvo para observar, degrade para o comportamento antigo (sempre visível).
    if (!target || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-48px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-grass-100 bg-white/95 p-3 backdrop-blur transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <Link
        href={href}
        tabIndex={visible ? 0 : -1}
        className="mx-auto block max-w-lg rounded-xl bg-grass-600 py-4 text-center text-lg font-extrabold text-white shadow-lg transition-colors hover:bg-grass-700 active:bg-grass-700"
      >
        {label}
      </Link>
    </div>
  );
}
