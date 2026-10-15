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
        title="Community (CSR)"
        description="Our work with communities: the introduction, our impact in numbers and each programme."
      />
      <CsrEditor
        canPublish={canAccess(session.permissions, "csr", "publish", session.isSuperAdmin)}
        canDelete={canAccess(session.permissions, "csr", "delete", session.isSuperAdmin)}
      />
    </>
  );
}
