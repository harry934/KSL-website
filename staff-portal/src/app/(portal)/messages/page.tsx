import { MessagesInbox } from "@/components/messages/messages-inbox";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "messages", "view", session.isSuperAdmin)) {
    redirect("/");
  }
  const params = await searchParams;

  return (
    <>
      <PageHeader title="Messages" description="Forms sent from the website contact page." />
      <MessagesInbox initialId={params.id ?? null} />
    </>
  );
}
