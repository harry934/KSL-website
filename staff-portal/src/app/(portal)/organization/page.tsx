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
    <PageHeader title="Organisation" description="Introduction, leadership cards, the Strategic Plan download, and the milestones on Who We Are. The organisation structure opens in a popup on the website. Board members are edited from Board in the sidebar." />
      <OrganizationEditor />
    </>
  );
}
