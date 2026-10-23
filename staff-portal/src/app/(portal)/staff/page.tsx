import { getStaffSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { StaffManager } from "@/components/staff/staff-manager";
import { PermissionsGrid } from "@/components/staff/permissions-grid";
import { PageHeader } from "@/components/portal/page-header";

export default async function StaffPage() {
  const session = await getStaffSession();
  if (!session?.isSuperAdmin) redirect("/");

  return (
    <>
      <PageHeader
        title="Staff"
        description="People who can sign in to this portal, and what each of them is allowed to do."
      />
      <div className="flex flex-col gap-[18px]">
      <PermissionsGrid />
      <StaffManager />
      </div>
    </>
  );
}
