export function passkeyError(error: unknown): string | null {
  const detail = error instanceof Error ? error : error && typeof error === "object" ? error as { message?: unknown; name?: unknown } : {};
  const name = typeof detail.name === "string" ? detail.name : "";
  const message = typeof detail.message === "string" ? detail.message : "";
  if (name === "AbortError" || name === "NotAllowedError" || /abort|cancel/i.test(message)) return null;
  if (/not supported|insecure/i.test(message)) {
    return "This browser cannot use a passkey. Use a current browser on this site address.";
  }
  if (message) return message;
  return "The passkey could not be used. Try again, or sign in with your username and password.";
}
