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
      <PageHeader title="Organisation" description="Leadership roles and the board. Open a board member to edit them, or remove them from the website." />
      <OrganizationEditor />
    </>
  );
}
