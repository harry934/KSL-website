import { CareersEditor } from "@/components/careers/careers-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function CareersPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "careers", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Careers" description="Vacancies, internships, and how candidates should apply." />
      <CareersEditor />
    </>
  );
}
