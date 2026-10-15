import { redirect } from "next/navigation";
import { SiteSettingsEditor } from "@/components/settings/site-settings-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";

export default async function SiteSettingsPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "site_settings", "view", session.isSuperAdmin)) redirect("/");

  const canEdit =
    canAccess(session.permissions, "site_settings", "edit", session.isSuperAdmin) &&
    canAccess(session.permissions, "site_settings", "publish", session.isSuperAdmin);

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Contact details, social links, footer and the announcement banner shown on every public page. Changes go live when saved."
      />
      <SiteSettingsEditor canEdit={canEdit} />
    </>
  );
}
