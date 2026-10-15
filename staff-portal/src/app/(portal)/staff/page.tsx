import { getStaffSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { StaffManager } from "@/components/staff/staff-manager";
import { PageHeader } from "@/components/portal/page-header";

export default async function StaffPage() {
  const session = await getStaffSession();
  if (!session?.isSuperAdmin) redirect("/");

  return (
    <>
      <PageHeader
        title="Staff management"
        description="Create agent accounts, choose which modules each agent can view, edit, publish or delete, and reset passwords."
      />
      <StaffManager />
    </>
  );
}
