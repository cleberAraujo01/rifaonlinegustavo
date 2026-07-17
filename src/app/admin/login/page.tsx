import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { isAdmin } from "@/lib/session";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login do organizador",
  robots: { index: false },
};

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4">
      <LockKeyhole
        className="mx-auto mb-2 h-8 w-8 text-grass-700"
        aria-hidden
      />
      <h1 className="mb-1 text-center text-2xl font-extrabold text-grass-900">
        Área do organizador
      </h1>
      <p className="mb-6 text-center text-sm text-stone-500">
        Acesso restrito à administração da rifa.
      </p>
      <LoginForm />
    </main>
  );
}
