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
      <PageHeader title="Organisation" description="Work from the top of the page downward. The chart is saved as one piece, then the cards under it. Major milestones are the path on Who We Are. Board members are edited from Board in the sidebar." />
      <OrganizationEditor />
    </>
  );
}
