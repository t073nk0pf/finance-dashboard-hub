import { Suspense } from "react";
import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-navy px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="max-w-2xl">
          <div className="inline-flex rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-blue-100">
            Finance Dashboard Hub
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">Enterprise finance control room</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Внутренний контур для план-факт контроля, управленческих отчетов, Armenia dashboard и office TV статуса.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {["Protected by role", "Plan / fact ready", "Office TV mode"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="w-full rounded-lg border border-white/10 bg-white p-8 text-ink shadow-panel">
          <div className="inline-flex rounded-md bg-primary px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-white">
            Secure access
          </div>
          <h2 className="mt-5 text-3xl font-black text-navy">Вход</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Используйте учетную запись, выданную администратором. Все финансовые разделы доступны только после авторизации.
          </p>
          <Suspense fallback={<div className="mt-8 rounded-lg border border-line bg-surface2 px-4 py-3 text-sm text-muted">Загрузка формы...</div>}>
            <LoginForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
