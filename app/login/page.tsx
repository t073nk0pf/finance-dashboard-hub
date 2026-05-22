import { Suspense } from "react";
import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4">
      <section className="w-full max-w-md rounded-lg border border-line bg-surface p-8 shadow-panel">
        <div className="inline-flex rounded-lg bg-primary px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-white">
          Finance Dashboard Hub
        </div>
        <h1 className="mt-5 text-3xl font-black text-navy">Вход</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Минимальная авторизация через session cookie. Админ создается seed-скриптом из ADMIN_EMAIL и ADMIN_PASSWORD.
        </p>
        <Suspense fallback={<div className="mt-8 text-sm text-muted">Загрузка формы...</div>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
