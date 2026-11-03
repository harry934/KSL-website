/** Supabase Auth needs an email; accounts created without one get an address on this domain that is never shown. */
export const INTERNAL_EMAIL_DOMAIN = "staff.ksl.internal";

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function internalEmailFor(username: string) {
  return `${username}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function isInternalEmail(email: string) {
  return email.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "Username must be 3–32 characters: lowercase letters, numbers, dot, dash or underscore.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Password must include upper and lower case letters.";
  }
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Enter a valid email address or leave it blank.";
}
