"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = { pixKey: string; pixKeyType: string };

export function PixCopyField({ pixKey, pixKeyType }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // navegadores antigos: seleção manual ainda funciona
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-grass-300 bg-grass-50 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-stone-500">Chave Pix ({pixKeyType})</p>
        <p className="select-all truncate text-lg font-extrabold text-grass-900 tabular">
          {pixKey}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-extrabold text-white ${
          copied ? "bg-grass-800" : "bg-grass-600 active:bg-grass-700"
        }`}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden /> Copiado!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" aria-hidden /> Copiar
          </>
        )}
      </button>
    </div>
  );
}
