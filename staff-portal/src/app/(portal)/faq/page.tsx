import { FaqEditor } from "@/components/faq/faq-editor";
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
      <h2 className="mb-6 text-lg font-semibold text-white">FAQ</h2>
      <FaqEditor />
    </>
  );
}
