import { EventsEditor } from "@/components/events/events-editor";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";
import { canAccess } from "@/lib/modules";
import { redirect } from "next/navigation";

export default async function EventsPage() {
  const session = await getStaffSession();
  if (!session || !canAccess(session.permissions, "events", "view", session.isSuperAdmin)) {
    redirect("/");
  }

  return (
    <>
      <PageHeader title="Events" description="Upcoming and past events on the news room and event detail pages." />
      <EventsEditor />
    </>
  );
}
