"use client";

export function ForecastNoDataSummary() {
  return (
    <section className="rounded-lg border border-line bg-surface px-3 py-2 shadow-soft">
      <div className="text-xs text-muted">
        По выбранным фильтрам прогнозные данные не найдены. Измените период, сценарий или метод прогноза.
      </div>
    </section>
  );
}
