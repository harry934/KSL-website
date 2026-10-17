export default function PortalLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-2 h-5 w-48" />
      <div className="skeleton mb-6 h-4 w-80 max-w-full" />
      <div className="ksl-card p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton mb-3 h-8 last:mb-0" />
        ))}
      </div>
    </div>
  );
}
