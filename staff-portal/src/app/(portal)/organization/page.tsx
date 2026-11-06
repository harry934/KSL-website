import { OrganizationEditor } from "@/components/organization/organization-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function OrganizationPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "organization", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
    <PageHeader title="Organisation" description="Introduction, the organogram, leadership cards, the chart download, and the milestones on Who We Are. Saving returns you to the section you changed. Board members are edited from Board in the sidebar." />
      <OrganizationEditor />
    </>
  );
}
