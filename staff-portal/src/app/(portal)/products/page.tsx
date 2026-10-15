import { redirect } from "next/navigation";
import { ProductsEditor } from "@/components/products/products-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";

export default async function ProductsPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "products", "view", session.isSuperAdmin)) redirect("/");

  return (
    <>
      <PageHeader title="Products" description="Vessel cards, specifications and filters on the public Products page." />
      <ProductsEditor
        canPublish={canAccess(session.permissions, "products", "publish", session.isSuperAdmin)}
        canDelete={canAccess(session.permissions, "products", "delete", session.isSuperAdmin)}
      />
    </>
  );
}
