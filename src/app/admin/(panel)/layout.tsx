import type { ReactNode } from "react";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { logoutAction } from "./actions";
import AdminNav from "./AdminNav";
import Toaster from "./Toaster";

export const dynamic = "force-dynamic";

const count = async (sql: string) => Number((await query<{ n: number | string }>(sql))[0]?.n ?? 0);

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const [reservations, cakes, requests] = await Promise.all([
    count(`SELECT count(*) AS n FROM reservations WHERE status = 'pending'`),
    count(`SELECT count(*) AS n FROM cake_orders WHERE status = 'new'`),
    count(`SELECT count(*) AS n FROM event_requests WHERE status = 'new'`),
  ]);

  return (
    <div className="lg:grid lg:grid-cols-[17.5rem_1fr]">
      <AdminNav
        badges={{ reservations, cakes, requests }}
        email={admin.email}
        logout={
          <form action={logoutAction}>
            <button className="min-h-11 underline underline-offset-4 hover:text-ivory">Esci</button>
          </form>
        }
      />
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">{children}</main>
      <Toaster />
    </div>
  );
}
