import { redirect } from "next/navigation";
import { SpareFilesPage } from "@/components/portal/spare-files";
import { getStaffSession } from "@/lib/session";

export default async function Page() {
  const session = await getStaffSession();
  if (!session?.isSuperAdmin) redirect("/");
  return <SpareFilesPage />;
}
