import { ChangePasswordForm } from "@/components/account/change-password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { PageHeader } from "@/components/portal/page-header";
import { getStaffSession } from "@/lib/session";

export default async function AccountPage() {
  const session = await getStaffSession();
  if (!session) return null;

  return (
    <>
      <PageHeader
        title="Account settings"
        description="Your sign-in username, optional email and password. You can sign in with either the username or the email."
      />
      <div className="grid items-start gap-[14px] lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-[15px] font-bold text-[#0b1f3a]">Profile</h2>
          <ProfileForm username={session.username} displayName={session.displayName} email={session.email} />
        </section>
        <section>
          <h2 className="mb-2 text-[15px] font-bold text-[#0b1f3a]">Password</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </>
  );
}
