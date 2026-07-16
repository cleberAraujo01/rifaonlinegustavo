"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-3">
      <input
        type="password"
        name="password"
        required
        autoFocus
        placeholder="Senha do organizador"
        className="w-full rounded-xl border border-grass-200 px-3 py-3 text-sm focus:border-grass-600 focus:outline-none"
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-grass-600 py-3 font-extrabold text-white active:bg-grass-700 disabled:bg-stone-300"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
