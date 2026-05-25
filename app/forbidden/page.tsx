export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4">
      <section className="w-full max-w-lg rounded-lg border border-line bg-surface p-8 shadow-panel">
        <div className="inline-flex rounded-lg bg-negative px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-white">
          403
        </div>
        <h1 className="mt-5 text-3xl font-black text-navy">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          У вашей роли нет доступа к этому разделу. Для просмотра доступны дашборды и отчетные страницы.
        </p>
      </section>
    </main>
  );
}
