type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="rounded-lg border border-dashed border-line bg-surface p-8 shadow-card">
      <div className="mb-4 h-1.5 w-16 rounded-full bg-primary" />
      <h2 className="text-xl font-black text-navy">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </section>
  );
}
