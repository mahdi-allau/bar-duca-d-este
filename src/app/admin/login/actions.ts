"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login } from "@/server/auth";

const schema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

export async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Inserisci email e password." };
  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: result.error };
  redirect("/admin");
}
