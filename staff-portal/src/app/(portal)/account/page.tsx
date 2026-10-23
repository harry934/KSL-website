import { AvatarField } from "@/components/account/avatar-field";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { PasskeysField } from "@/components/account/passkeys-field";
import { ProfileForm } from "@/components/account/profile-form";
import { PageHeader } from "@/components/portal/page-header";
import { FormSection } from "@/components/ui/form-bits";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AccountPage() {
  const session = await getStaffSession();
  if (!session) return null;

  const { data, error } = await createAdminClient()
    .from("staff_sessions")
    .select("seen_at")
    .eq("user_id", session.userId)
    .maybeSingle();
  const seen = !error && data?.seen_at
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(data.seen_at))
    : null;

  return (
    <>
      <PageHeader title="My account" description="Your photo, name, contact email, password and passkey." />
      <FormSection
        title={session.isSuperAdmin ? "This sign-in" : "Signed in"}
        description={
          session.isSuperAdmin ? "One session is open for this account. A new sign-in replaces it." : undefined
        }
        className="mb-4"
      >
        <p className="text-[14px] text-[#0b1f3a]">
          Signed in as <span className="font-semibold">{session.displayName}</span>
          {session.username ? <span className="text-[#6b7785]"> @{session.username}</span> : null}.
        </p>
        <p className="mt-1 text-[13px] text-[#6b7785]">
          {seen ? `Last activity ${seen} (Nairobi time).` : "Last activity will show here after the session record is available."}
        </p>
      </FormSection>
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
