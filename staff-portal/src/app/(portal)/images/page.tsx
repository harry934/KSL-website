import { redirect } from "next/navigation";
import { SiteImagesEditor } from "@/components/settings/site-images-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";

export default async function SiteImagesPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "site_settings", "view", session.isSuperAdmin)) redirect("/");

  const canEdit =
    canAccess(session.permissions, "site_settings", "edit", session.isSuperAdmin) &&
    canAccess(session.permissions, "site_settings", "publish", session.isSuperAdmin);

  return (
    <>
      <PageHeader
        title="Website images"
        description="Choose a page, then change its photos. On Home you can also set the hero slides."
      />
      <SiteImagesEditor canEdit={canEdit} />
    </>
  );
}
