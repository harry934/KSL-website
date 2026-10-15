import { ServicesEditor } from "@/components/services/services-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function ServicesPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "services", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Services" description="The services shown on the website, with their documents." />
      <ServicesEditor />
    </>
  );
}
