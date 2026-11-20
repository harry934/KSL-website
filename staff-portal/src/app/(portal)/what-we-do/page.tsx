import { redirect } from "next/navigation";
import { WhatWeDoEditor } from "@/components/settings/what-we-do-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";

export default async function WhatWeDoPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "site_settings", "view", session.isSuperAdmin)) redirect("/");

  const canEdit =
    canAccess(session.permissions, "site_settings", "edit", session.isSuperAdmin) &&
    canAccess(session.permissions, "site_settings", "publish", session.isSuperAdmin);

  return (
    <>
      <PageHeader
        title="What we do"
        description="The cards on the home page under What we do. Edit the title, summary, full detail, photo, button label, and link for each card."
      />
      <WhatWeDoEditor canEdit={canEdit} />
    </>
  );
}
