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
        description="Card photos and page headers. Each page has its own header. Choose a photo from the gallery, including the pictures already on the site."
      />
      <SiteImagesEditor canEdit={canEdit} />
    </>
  );
}
