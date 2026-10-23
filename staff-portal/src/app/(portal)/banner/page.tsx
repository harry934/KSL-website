import { redirect } from "next/navigation";
import { BannerEditor } from "@/components/settings/banner-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";

export default async function BannerPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "site_settings", "view", session.isSuperAdmin)) redirect("/");

  const canEdit =
    canAccess(session.permissions, "site_settings", "edit", session.isSuperAdmin) &&
    canAccess(session.permissions, "site_settings", "publish", session.isSuperAdmin);

  return (
    <>
      <PageHeader
        title="Banner"
        description="Notices on every page of the website. Queue several, and the site shows the first one that is switched on and whose dates include today."
      />
      <BannerEditor canEdit={canEdit} />
    </>
  );
}
