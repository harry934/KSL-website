export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 text-[22px] font-bold leading-tight tracking-[-0.01em] text-[#0b1f3a]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[14px] text-[#5b6775]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
