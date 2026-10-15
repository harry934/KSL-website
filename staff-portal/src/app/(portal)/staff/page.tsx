import { getStaffSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { StaffManager } from "@/components/staff/staff-manager";

export default async function StaffPage() {
  const session = await getStaffSession();
  if (!session?.isSuperAdmin) redirect("/");

  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-white">Staff management</h2>
      <StaffManager />
    </>
  );
}
