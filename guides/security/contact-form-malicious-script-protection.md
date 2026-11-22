# Contact Us malicious-script protection

## Purpose

This document explains the security protections used for the **Contact Us** form on the Kenya Shipyards Limited website.

The form accepts messages from the public. It is designed to:

- prevent ordinary script or HTML payloads from being submitted;
- detect scripts hidden by encoding;
- reduce automated submissions and repeated requests;
- verify that a real browser completed the request;
- store suspicious submissions with risk information for staff review.

These controls protect the submission process. They do not replace safe handling when stored messages are displayed.

## How a visitor submits the form

1. The visitor completes the Contact Us form.
2. The browser requests a challenge and Turnstile check from the staff portal.
3. The visitor completes the Turnstile check.
4. The browser submits the form values and security tokens to `/api/public/contact`.
5. The server validates the request and inspects all text fields.
6. Safe submissions are stored in `website_messages`.
7. Malicious or automated submissions are rejected and are not saved.

## 1. Server-side validation

The main server file is:

`staff-portal/src/app/api/public/contact/route.ts`

The server:

- rejects requests larger than 32 KB;
- limits first names and surnames to 80 characters;
- limits email addresses to 200 characters;
- limits subjects to 160 characters;
- limits messages to 4,000 characters;
- requires a first name, surname, subject, and message;
- checks that the email address has a valid basic format;
- allows only the published contact preferences.

The server performs these checks even if browser validation is disabled or bypassed.

## 2. Malicious-script pattern detection

The application uses `looksLikeCode` from:

`staff-portal/src/lib/input-guard.ts`

It looks for script-like patterns, including:

- `<script>`, `<iframe>`, `<object>`, `<embed>`, `<svg>`, and `<style>` tags;
- `javascript:` links;
- `vbscript:` links;
- HTML pages supplied through `data:` URLs;
- HTML event-handler attributes such as `onclick=`;
- `document.cookie`, `document.write`, and `eval()`.

When one of these patterns is found, the submission is blocked.

## 3. Encoded malicious-text detection

The scanner in:

`staff-portal/src/lib/contact-payload-scan.ts`

checks for common ways an attacker might hide script text. It scans for:

- HTML entities, such as `&lt;script&gt;`;
- URL encoding, such as `%3Cscript%3E`;
- Base64;
- Base64 containing a gzip-compressed payload;
- hexadecimal values;
- `\x` hexadecimal escapes;
- octal escapes;
- binary text;
- Base64 embedded inside a larger value.

The application tries to convert these representations back into readable text and scans the decoded result. If the decoded result contains script-like code, the submission is rejected.

The scanner supports several common attack methods, but it is not a complete JavaScript parser or a guarantee that every unknown encoding will be detected.

## 4. Signed short-lived challenge

The challenge system is implemented in:

`staff-portal/src/lib/contact-token.ts`

The flow is:

1. `/api/public/contact-token` creates a challenge.
2. The challenge contains a creation time, expiry time, and random value.
3. The server signs the challenge using an HMAC and a secret server key.
4. The browser sends the signed challenge with the contact form.
5. The server verifies the signature and timestamp.

The challenge:

- expires after 20 minutes;
- cannot be submitted within two seconds of being issued;
- is rejected if the signature or timestamp is invalid.

This makes direct, instantly forged submissions more difficult, but it does not prove that every submitter is a person.

## 5. Cloudflare Turnstile

The Contact Us form uses **Cloudflare Turnstile** to help distinguish normal visitors from automated traffic.

When the page loads:

1. The browser requests the Turnstile site key and challenge.
2. The page loads the Cloudflare Turnstile widget.
3. Turnstile creates a verification token.
4. The browser submits that token with the message.

The server sends the token to Cloudflare's verification service. Cloudflare returns the verification result. The contact message is accepted only when verification succeeds.

In production, Turnstile is required. If the Turnstile secret key is missing or Cloudflare cannot verify the token, the submission is rejected.

## 6. IP-based rate limiting

Before saving a message, the server counts recent contact attempts from the submitter's IP address.

The current rule is:

- five accepted attempts;
- in a rolling hour;
- for one identified IP address.

The sixth attempt is rejected with HTTP status `429` until the oldest attempts in the rolling hour expire.

IP limiting reduces automated flooding and repeated submissions. It can affect multiple people behind a shared public network, and its reliability depends on the hosting platform supplying the real client IP rather than a user-controlled header.

## 7. Honeypot field

The form includes a hidden field named `website`.

Normal visitors do not enter anything into this field. Some simple automated systems fill every available field. If the hidden field contains text, the server returns a successful-looking response but does not store the message.

The honeypot is a supplementary filter and not a complete bot-prevention system.

## 8. Risk scoring

The application in:

`staff-portal/src/lib/contact-risk.ts`

calculates a risk score for each submission. It adds risk points for signals such as:

- code-like names or messages;
- a website link inside a name;
- names containing many digits;
- disposable email domains;
- multiple links;
- short messages containing links;
- repeated characters;
- encoded or obfuscated content.

The score and named flags are stored with accepted website messages. A high score causes a review flag, but does not automatically prove that a message is malicious.

Staff should treat the score as a triage aid rather than the final decision.

## 9. Safe handling of submitted text

Malicious-input blocking is only one part of the protection.

Stored text must be displayed by the staff inbox as plain text or correctly escaped output. It must not be inserted into a page using raw `innerHTML` without sanitizing it.

Safe rendering is important because an attacker can submit an unexpected string or a bug in the scanner could allow one through.

## Summary of the protective layers

| Protection | Purpose |
|---|---|
| Server-side field validation | Rejects incomplete, malformed, oversized, or unexpected submissions |
| Pattern detection | Blocks common script and HTML payload patterns |
| Decoding and re-scanning | Finds scripts hidden by common encoding methods |
| Signed challenge | Rejects forged, expired, and instantly submitted requests |
| Cloudflare Turnstile | Adds a bot check verified by the server |
| IP rate limiting | Limits repeated submissions from one IP |
| Honeypot | Quietly catches some simple automated submissions |
| Risk scoring | Records warning signals for staff review |

## Important limitations

This approach is effective against common malicious submissions and automated spam, but it cannot guarantee that every possible attack will be detected.

- Pattern detection cannot cover every future or unusual encoding method.
- Turnstile can reduce bot traffic but cannot prove that every submitter is trustworthy.
- IP limits can incorrectly affect users sharing an IP address.
- Browser-side checks can always be bypassed and are therefore not security boundaries.
- Stored messages must still be displayed safely.

## Testing

The repository includes tests in:

`staff-portal/src/lib/security.test.ts`

The tests cover ordinary messages, selected Base64 and URL-encoded scripts, HTML entities, hexadecimal escapes, gzip payloads, risk scoring, and Turnstile fail-closed behavior.

Production must also be checked after deployment to confirm that:

- both Turnstile keys are configured;
- the correct production site domain is allowed;
- the contact endpoint is reachable;
- ordinary submissions work;
- malicious submissions are rejected;
- rate limiting works behind the actual hosting proxy;
- staff inbox text is rendered safely.

## Review conclusion

The Contact Us form uses **layered, server-side protection** rather than relying on a browser script alone. The strongest parts are server validation, encoded-payload scanning, signed challenge verification, Cloudflare Turnstile, and IP rate limiting.

Together, these controls make simple malicious-script submission and automated flooding significantly less likely. They are viable and reliable for common risks, but should remain paired with safe message rendering, operational monitoring, and periodic testing.
