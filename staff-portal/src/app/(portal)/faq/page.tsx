import { FaqEditor } from "@/components/faq/faq-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function FaqPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "faq", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Questions and answers" description="The questions and answers on the website's FAQ page." />
      <FaqEditor />
    </>
  );
}
