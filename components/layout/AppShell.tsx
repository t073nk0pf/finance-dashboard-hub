"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopFilterBar } from "@/components/layout/TopFilterBar";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  description: string;
  period?: string;
  legalEntities?: number | string;
  accent?: "default" | "armenia";
};

export function AppShell({ children, title, description, period, legalEntities, accent = "default" }: AppShellProps) {
  return (
    <div className={`flex min-h-screen bg-bg ${accent === "armenia" ? "armenia-theme" : ""}`}>
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <header className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <div
                className={`mb-3 inline-flex rounded-lg px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-white ${
                  accent === "armenia" ? "bg-accent" : "bg-primary"
                }`}
              >
                Hybrid Finance Control
              </div>
              <h1 className="text-3xl font-black leading-tight text-navy sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-base">{description}</p>
            </div>
            <TopFilterBar period={period} legalEntities={legalEntities} accent={accent} />
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
