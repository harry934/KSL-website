import { GalleryEditor } from "@/components/gallery/gallery-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function GalleryPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "gallery", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Gallery" description="General media and photo gallery for administrators." />
      <GalleryEditor />
    </>
  );
}
