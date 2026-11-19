/** Short id for correlating staff-facing errors with server logs (not a secret). */
export function newRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Database errors in words a non-technical editor can act on. */
export function dbError(err: { message?: string; code?: string } | null | undefined) {
  const message = err?.message ?? "";
  if (err?.code === "23505" || /duplicate key/i.test(message)) {
    return "Another item already uses this name or web address. Change it slightly and save again.";
  }
  if (err?.code === "23514" || err?.code === "22P02" || err?.code === "22007") {
    if (/uuid/i.test(message)) {
      return "That item could not be found (invalid id). Refresh the page and try again.";
    }
    if (/json|jsonb/i.test(message)) {
      return "That change could not be saved because of a data format problem. Refresh and try again.";
    }
    return "One of the values is not in the right format. Check the form and try again.";
  }
  if (err?.code === "23502") return "Some required information is missing. Fill in all fields and try again.";
  if (err?.code === "23503") return "That item is linked to something else. Refresh the page and try again.";
  if (err?.code === "42P01" || err?.code === "42703") {
    return "The database is missing a required table or column. Ask an administrator to check migrations.";
  }
  if (/there is no unique or exclusion constraint matching the ON CONFLICT/i.test(message) || /ON CONFLICT/i.test(message)) {
    return "Could not save because of a database conflict setting. Ask an administrator to check the logs.";
  }
  if (err?.code === "57014" || /timeout/i.test(message)) {
    return "The database took too long to respond. Wait a moment and try again.";
  }
  return "Something went wrong. Please try again.";
}
