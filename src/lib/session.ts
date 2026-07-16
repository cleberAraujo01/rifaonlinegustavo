import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "admin_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error("SESSION_SECRET não definida em .env.local (veja .env.example).");
  }
  return new TextEncoder().encode(s);
}

export async function createAdminSession(): Promise<void> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 3600,
    path: "/",
  });
}

export async function destroyAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

/** Guarda de página: redireciona para o login se não autenticado. */
export async function ensureAdminOrRedirect(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** Guarda de server action: lança se não autenticado (defesa em profundidade). */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
}
