type PlaceholderSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  placeholder: string;
};

export function PlaceholderSection({
  description,
  eyebrow,
  placeholder,
  title,
}: PlaceholderSectionProps) {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--admin-text-strong)]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--admin-text)]">
          {description}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--admin-dashboard-border)] bg-[var(--admin-dashboard-surface)] p-6 shadow-[var(--admin-dashboard-shadow)]">
        <p className="text-sm font-medium text-[var(--admin-text-strong)]">
          {placeholder}
        </p>
      </div>
    </section>
  );
}
