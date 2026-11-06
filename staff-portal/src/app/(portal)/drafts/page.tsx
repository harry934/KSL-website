import { redirect } from "next/navigation";
import { DraftsPage } from "@/components/portal/drafts-page";
import { canReviewDrafts } from "@/lib/portal-nav";
import { getStaffSession } from "@/lib/session";

export default async function Page() {
  const session = await getStaffSession();
  if (!session || !canReviewDrafts(session)) redirect("/");
  return <DraftsPage />;
}
