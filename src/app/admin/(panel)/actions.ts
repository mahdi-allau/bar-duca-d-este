"use server";

import { redirect } from "next/navigation";
import { logout } from "@/server/auth";

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}
