"use client";

/** Formata o prazo no fuso do usuário (o servidor roda em UTC). */
export function Deadline({ iso }: { iso: string }) {
  const d = new Date(iso);
  const label = d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return <strong>{label}</strong>;
}
