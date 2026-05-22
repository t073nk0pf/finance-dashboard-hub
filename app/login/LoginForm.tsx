"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    setLoading(false);
    if (!response.ok) {
      setError("Не удалось войти. Проверь email, пароль и подключение к базе.");
      return;
    }

    router.replace(params.get("next") || "/dashboards/plan-fact");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm font-bold text-slate-700">Email</span>
        <input
          className="mt-2 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none ring-primary/20 focus:ring-4"
          name="email"
          type="email"
          defaultValue="admin@example.com"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-slate-700">Пароль</span>
        <input
          className="mt-2 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none ring-primary/20 focus:ring-4"
          name="password"
          type="password"
          defaultValue="admin"
          required
        />
      </label>
      {error ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-negative">{error}</div> : null}
      <button className="w-full rounded-lg bg-navy px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={loading} type="submit">
        {loading ? "Вход..." : "Войти"}
      </button>
    </form>
  );
}
