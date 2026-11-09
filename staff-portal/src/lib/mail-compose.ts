export type ComposeFields = {
  to?: string;
  cc?: string;
  subject: string;
  body: string;
};

export function gmailComposeUrl({ to, cc, subject, body }: ComposeFields) {
  const params = new URLSearchParams();
  params.set("view", "cm");
  params.set("fs", "1");
  if (to) params.set("to", to);
  if (cc) params.set("cc", cc);
  params.set("su", subject);
  if (body) params.set("body", body.slice(0, 6_000));
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Outlook on the web (personal and work accounts open compose here or in the app). */
export function outlookWebComposeUrl({ to, subject, body }: ComposeFields) {
  const params = new URLSearchParams();
  if (to) params.set("to", to);
  params.set("subject", subject);
  if (body) params.set("body", body.slice(0, 6_000));
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

export function openMailto({ to, subject, body }: ComposeFields) {
  const dest = to ? encodeURIComponent(to) : "";
  const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 6_000))}`;
  const href = to ? `mailto:${dest}?${q}` : `mailto:?${q}`;
  const link = document.createElement("a");
  link.href = href;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
