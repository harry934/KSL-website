import { NewsEditor } from "@/components/news/news-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function NewsPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "news", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="News" description="News stories shown on the home page and in the News Room." />
      <NewsEditor />
    </>
  );
}
