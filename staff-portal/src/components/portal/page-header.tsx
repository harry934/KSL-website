export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-8 border-b border-[#DDE5F0] pb-6">
      <p className="ksl-kicker">Staff portal</p>
      <h1 className="ksl-display mt-1 text-2xl font-semibold tracking-tight text-[#09296C]">{title}</h1>
      <div className="ksl-gold-rule mt-3" />
      {description ? <p className="mt-3 max-w-2xl text-sm text-[#5c6578]">{description}</p> : null}
    </header>
  );
}
