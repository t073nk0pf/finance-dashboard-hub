"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print hidden min-h-screen w-72 shrink-0 border-r border-line bg-surface px-4 py-5 shadow-soft lg:block">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy text-sm font-black text-white">FH</span>
        <span>
          <span className="block text-sm font-black uppercase tracking-[0.08em] text-primary">Finance</span>
          <span className="block text-lg font-black text-navy">Dashboard Hub</span>
        </span>
      </Link>

      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="mb-2 px-3 text-xs font-black uppercase tracking-[0.08em] text-muted">{section.label}</div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-bold transition ${
                      active ? "bg-primary text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
