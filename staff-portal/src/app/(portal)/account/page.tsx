import { ChangePasswordForm } from "@/components/account/change-password-form";
import { PageHeader } from "@/components/portal/page-header";

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Your account" description="Change your sign-in password." />
      <ChangePasswordForm />
    </>
  );
}
