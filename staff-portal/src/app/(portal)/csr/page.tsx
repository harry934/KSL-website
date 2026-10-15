import { redirect } from "next/navigation";
import { CsrEditor } from "@/components/csr/csr-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";

export default async function CsrPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "csr", "view", session.isSuperAdmin)) redirect("/");

  return (
    <>
      <PageHeader
        title="CSR"
        description="Corporate social responsibility page: intro, impact figures and community programmes."
      />
      <CsrEditor
        canPublish={canAccess(session.permissions, "csr", "publish", session.isSuperAdmin)}
        canDelete={canAccess(session.permissions, "csr", "delete", session.isSuperAdmin)}
      />
    </>
  );
}
