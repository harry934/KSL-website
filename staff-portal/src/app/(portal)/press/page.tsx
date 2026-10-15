import { PressEditor } from "@/components/press/press-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function PressPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "press", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Press kit" description="Information and files for journalists, shown in the News Room." />
      <PressEditor />
    </>
  );
}
