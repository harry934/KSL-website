import { OrganizationEditor } from "@/components/organization/organization-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function BoardPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "organization", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader
        title="Board"
        description="Directors on the KSL Board page. Drag a member inside their section to change who appears first."
      />
      <OrganizationEditor view="board" />
    </>
  );
}
