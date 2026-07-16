"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createAdminSession, destroyAdminSession } from "@/lib/session";

export type LoginState = { error: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) {
    return {
      error:
        "ADMIN_PASSWORD_HASH não configurado. Rode: npm run admin:hash -- \"sua-senha\"",
    };
  }
  if (typeof password !== "string" || !bcrypt.compareSync(password, hash)) {
    return { error: "Senha incorreta" };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
