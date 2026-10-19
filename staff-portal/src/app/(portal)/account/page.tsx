import { AvatarField } from "@/components/account/avatar-field";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { PasskeysField } from "@/components/account/passkeys-field";
import { ProfileForm } from "@/components/account/profile-form";
import { PageHeader } from "@/components/portal/page-header";
import { FormSection } from "@/components/ui/form-bits";
import { getStaffSession } from "@/lib/session";

export default async function AccountPage() {
  const session = await getStaffSession();
  if (!session) return null;

  return (
    <>
      <PageHeader title="My account" description="Your photo, name, contact email, password and passkey." />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <FormSection
          title="Profile photo"
          description="Shown next to your name at the top of the portal."
          className="lg:col-span-2"
        >
          <AvatarField name={session.displayName} avatarUrl={session.avatarUrl} />
        </FormSection>
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
        <FormSection
          title="Passkey"
          description="Sign in on this browser with a passkey saved for your existing staff account."
          className="lg:col-span-2"
        >
          <PasskeysField />
        </FormSection>
      </div>
    </>
  );
}
