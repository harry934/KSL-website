import { getStaffSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { StaffManager } from "@/components/staff/staff-manager";
import { PageHeader } from "@/components/portal/page-header";

export default async function StaffPage() {
  const session = await getStaffSession();
  if (!session?.isSuperAdmin) redirect("/");

  return (
    <>
      <PageHeader title="Staff management" description="Register agents and set module permissions (osTicket-style)." />
      <StaffManager />
    </>
  );
}
