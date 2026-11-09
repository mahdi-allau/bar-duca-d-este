import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { one, query } from "./db";
import { newToken, sha256, verifyPassword } from "./password";
import { allow, clientIp } from "./rate-limit";

const COOKIE = "de_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Admin = { id: number; email: string };

export async function login(email: string, password: string) {
  const ip = await clientIp();
  const normalized = email.trim().toLowerCase();
  // 8 attempts per 15 minutes for the same address and for the same visitor
  const okIp = await allow(`login:ip:${ip}`, 8, 900);
  const okMail = await allow(`login:mail:${normalized}`, 8, 900);
  if (!okIp || !okMail) return { ok: false as const, error: "Troppi tentativi. Riprova tra qualche minuto." };

  const user = await one<{ id: number; password_hash: string }>(
    `SELECT id, password_hash FROM admin_users WHERE email = $1`,
    [normalized],
  );
  // Always run a verification so response time does not reveal whether the user exists.
  const valid = await verifyPassword(
    password,
    user?.password_hash ??
      "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  );
  if (!user || !valid) return { ok: false as const, error: "Email o password non corrette." };

  const token = newToken();
  await query(`INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES ($1,$2, now() + ($3 || ' seconds')::interval)`, [
    sha256(token),
    user.id,
    String(MAX_AGE),
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { ok: true as const };
}

export async function logout() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [sha256(token)]);
  store.delete(COOKIE);
}

/** The signed-in administrator, or null. Cached for the duration of one request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await one<{ id: number; email: string }>(
    `SELECT u.id, u.email FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return row ?? null;
});

/** Use at the top of every admin page and every admin Server Action. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function adminExists() {
  const row = await one<{ n: number | string }>(`SELECT count(*) AS n FROM admin_users`);
  return Number(row?.n ?? 0) > 0;
}
