import { DownloadsEditor } from "@/components/downloads/downloads-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function DownloadsPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "downloads", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Downloads" description="Corporate documents on the downloads page and site search." />
      <DownloadsEditor />
    </>
  );
}
