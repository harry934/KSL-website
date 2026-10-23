import { redirect } from "next/navigation";
import { RecyclePage } from "@/components/portal/recycle-page";
import { canAccess } from "@/lib/modules";
import { RECYCLE_SOURCES } from "@/lib/recycle-sources";
import { getStaffSession } from "@/lib/session";

export default async function Page() {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  const allowed = RECYCLE_SOURCES.some(
    (source) =>
      canAccess(session.permissions, source.module, "view", session.isSuperAdmin) ||
      canAccess(session.permissions, source.module, "delete", session.isSuperAdmin)
  );
  if (!allowed) redirect("/");
  return <RecyclePage />;
}
