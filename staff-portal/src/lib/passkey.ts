type PasskeyFailure = { message?: string; code?: string; name?: string } | null | undefined;

/** A cancelled browser prompt is not an error to show. */
export function passkeyError(error: PasskeyFailure): string | null {
  const code = error?.code ?? "";
  const name = error?.name ?? "";
  const message = error?.message ?? "";
  if (
    name === "AbortError" ||
    code === "ERROR_CEREMONY_ABORTED" ||
    /abort|cancel|not allowed|timed out/i.test(message)
  ) {
    return null;
  }
  if (code === "passkey_disabled") {
    return "Passkeys are not turned on for this portal yet.";
  }
  if (code === "ERROR_INVALID_RP_ID") {
    return "The passkey address in Supabase is not valid. Set the relying party ID to ksl-websitemink.vercel.app with no dot at the end.";
  }
  if (code === "ERROR_INVALID_DOMAIN") {
    return "Open https://ksl-websitemink.vercel.app to use a passkey. This page is a different address.";
  }
  if (code === "webauthn_credential_exists") {
    return "That passkey is already saved on this account.";
  }
  if (/not supported|insecure/i.test(message)) {
    return "This browser cannot use a passkey. Use a current browser on this site address.";
  }
  return "The passkey could not be used. Try again, or sign in with your username and password.";
}
