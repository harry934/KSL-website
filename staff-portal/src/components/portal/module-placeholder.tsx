import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";

export function ModulePlaceholder({ module }: { module: ModuleKey }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-[#0d2847]/40 p-10 text-center">
      <p className="text-lg font-semibold text-white">{MODULE_LABELS[module]}</p>
      <p className="mt-2 text-sm text-slate-400">
        This module is wired in the portal navigation. Content editors and API hooks will be added in the
        next build phase. FAQ and Staff are live now.
      </p>
    </div>
  );
}
