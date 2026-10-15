import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { PageHeader } from "@/components/portal/page-header";

export function ModulePlaceholder({ module }: { module: ModuleKey }) {
  return (
    <>
      <PageHeader title={MODULE_LABELS[module]} description="This module is on the roadmap. FAQ and Staff are live today." />
      <div className="ksl-card border-dashed p-10 text-center">
        <p className="text-sm text-[#5c6578]">
          Editors, media uploads, and publish workflow for {MODULE_LABELS[module].toLowerCase()} will be added in the
          next phase. Your permissions are already wired in the sidebar.
        </p>
      </div>
    </>
  );
}
