"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccessAdminRoute } from "@/lib/permissions";

const sections = [
  {
    label: "Дашборды",
    items: [
      { href: "/dashboards/plan-fact", label: "План-факт" },
      { href: "/dashboards/forecast", label: "Forecast" },
    ],
  },
  {
    label: "Армения",
    items: [
      { href: "/armenia", label: "Обзор" },
      { href: "/armenia/profitability", label: "Прибыльность" },
      { href: "/armenia/growth", label: "Рост" },
      { href: "/armenia/restaurants", label: "Рестораны" },
      { href: "/armenia/unit-economics", label: "Unit economics" },
    ],
  },
  {
    label: "Операции",
    items: [
      { href: "/tv/armenia", label: "Office TV" },
      { href: "/admin/users", label: "Пользователи" },
      { href: "/admin/imports", label: "Импорты" },
      { href: "/admin/metrics", label: "Метрики" },
      { href: "/admin/forecast-rules", label: "Правила forecast" },
    ],
  },
];

const sectionTone: Record<string, string> = {
  Дашборды: "bg-blue-50 text-primary",
  Армения: "bg-amber-50 text-accent",
  Операции: "bg-slate-100 text-slate-700",
};

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const response = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
      if (!active || !response?.ok) return;
      const payload = (await response.json().catch(() => null)) as { user?: { role?: string } } | null;
      if (active) setRole(payload?.user?.role ?? null);
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside className="no-print sticky top-0 hidden h-screen w-72 shrink-0 border-r border-line bg-surfaceElevated px-4 py-5 shadow-soft lg:block">
      <Link href="/" className="mb-8 flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-surface2 focus-visible:bg-surface2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy text-sm font-black text-white shadow-sm">FH</span>
        <span>
          <span className="block text-xs font-black uppercase tracking-[0.12em] text-primary">Finance</span>
          <span className="block text-lg font-black text-navy">Dashboard Hub</span>
        </span>
      </Link>

      <nav className="space-y-6">
        {sections.map((section) => {
          const items = section.items.filter((item) => !item.href.startsWith("/admin") || (role ? canAccessAdminRoute(role, item.href) : false));
          if (items.length === 0) return null;

          return (
            <div key={section.label}>
              <div className="mb-2 flex items-center gap-2 px-3 text-xs font-black uppercase tracking-[0.08em] text-muted">
                <span className={`h-2 w-2 rounded-full ${sectionTone[section.label] ?? "bg-slate-100 text-muted"}`} />
                {section.label}
              </div>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                        active ? "bg-navy text-white shadow-soft" : "text-slate-700 hover:bg-surface2 hover:text-navy"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-transparent group-hover:bg-line"}`} />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
