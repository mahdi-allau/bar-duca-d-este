import Image from "next/image";
import { redirect } from "next/navigation";
import { adminExists, getAdmin } from "@/server/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accesso" };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const exists = await adminExists();

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm border border-espresso/15 bg-cream p-8 shadow-sm">
        <Image src="/logo-seal-480.webp" alt="Duca d'Este" width={72} height={72} className="mx-auto h-[4.5rem] w-[4.5rem] rounded-full" />
        <h1 className="mt-5 text-center font-display text-3xl font-light">Amministrazione</h1>
        {exists ? (
          <div className="mt-8">
            <LoginForm />
          </div>
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-espresso/80">
            Nessun amministratore configurato. Imposta <code>ADMIN_EMAIL</code> e <code>ADMIN_PASSWORD</code> tra le
            variabili d&rsquo;ambiente e riavvia: il primo accesso verrà creato automaticamente.
          </p>
        )}
      </div>
    </main>
  );
}
