import { ChangePasswordForm } from "@/components/account/change-password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { PageHeader } from "@/components/portal/page-header";
import { FormSection } from "@/components/ui/form-bits";
import { getStaffSession } from "@/lib/session";

export default async function AccountPage() {
  const session = await getStaffSession();
  if (!session) return null;

  return (
    <>
      <PageHeader title="My account" description="Your name, contact email and password." />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <FormSection title="My details">
          <ProfileForm
            username={session.username}
            displayName={session.displayName}
            email={session.email}
            canRename={session.isSuperAdmin}
          />
        </FormSection>
        <FormSection title="Change password">
          <ChangePasswordForm />
        </FormSection>
      </div>
    </>
  );
}
