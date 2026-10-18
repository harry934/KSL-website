import { redirect } from "next/navigation";
import { ProjectsEditor } from "@/components/projects/projects-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";

export default async function ProjectsPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "projects", "view", session.isSuperAdmin)) redirect("/");

  return (
    <>
      <PageHeader title="Projects" description="The work shown on the Projects page. Add a project, change it, or remove it." />
      <ProjectsEditor
        canPublish={canAccess(session.permissions, "projects", "publish", session.isSuperAdmin)}
        canDelete={canAccess(session.permissions, "projects", "delete", session.isSuperAdmin)}
      />
    </>
  );
}
