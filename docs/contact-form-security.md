# Contact form security

This note explains, in plain language, what the Contact Us page does when someone tries to send a malicious script, and how reliable that protection is.

A malicious script here means text that is meant to run as code in a browser — for example `<script>…</script>`, a hidden `javascript:` link, or an `onclick` / `onerror` trick — sometimes disguised with encoding so it does not look like code at first glance.

## Short answer

Yes, this is a viable setup for a public contact form, and the part that actually stops a script from running is reliable.

The form does two different jobs:

1. **Stop the script from running.** Messages are saved as ordinary text and shown as ordinary text in the staff inbox. The browser does not treat that text as a web page, so a script tag sitting in a message does not execute. That is the reliable protection.
2. **Refuse obvious attacks before they are saved.** A second set of checks looks for code-like text, including text that has been disguised (encoded). Those checks catch the common tricks. They are useful, but they are a filter, not a guarantee. A new disguise can slip past a list of known patterns.

Spam and bots are handled separately (a hidden field, a short waiting period, Cloudflare Turnstile, and a limit of five sends per hour from one address). That part is solid against automated junk and weak against a person who is willing to fill the form by hand.

## What happens when someone sends a message

The checks run in this order.

### 1. The browser watches the form while the person types

File: `js/input-guard.js`

On the Contact Us page, if a name, subject, or message starts to look like code, the page sends the visitor to the “blocked” error page. The same check runs again when they press Send.

This is a convenience. It stops casual pasting. It is not the real lock, because anyone can turn off that script or send the form data straight to the server.

### 2. The server checks the text again, including disguised text

Files: `staff-portal/src/app/api/public/contact/route.ts`, `staff-portal/src/lib/contact-payload-scan.ts`, `staff-portal/src/lib/input-guard.ts`

Every field is clipped to a maximum length, and the whole request is rejected if it claims to be larger than 32 KB. Then the server tries to “unwrap” the text. It looks through these disguises, including several layers stacked on top of each other (up to 24 steps):

- HTML codes such as `&lt;script&gt;` or `&#60;`
- Web-address encoding such as `%3Cscript%3E`
- Base64, including a Base64 blob hidden inside a normal sentence
- Gzip-compressed text that was then Base64-encoded (output is capped so a tiny message cannot expand into a huge one)
- Hex, `\x` escapes, octal escapes, and binary written as 8-bit words

After each unwrap, it asks: does this look like code? It looks for:

- Tags that are commonly abused: `script`, `iframe`, `object`, `embed`, `svg`, `math`, `img`, `video`, `style`, `form`, and a few others
- `javascript:` and `vbscript:` links
- `data:text/html`
- Event handlers such as `onclick=` or `onerror=`
- `document.cookie`, `document.write`, and `eval(`

If any layer matches, the message is **not saved**. The visitor is sent to the blocked page. Staff do not see it, and the sender’s IP address is not stored for that attempt.

Ordinary sentences (“Please tell me about dry dock dates”) do not match and are allowed through.

### 3. A few checks that are not about scripts

Still on the server, before the message is saved:

- **Hidden “website” field.** People never see it. If a program fills it in, the site pretends the message was sent and throws it away.
- **Proof the form was actually opened.** The page asks the server for a signed token. The token must be at least 2 seconds old and at most 20 minutes old. A changed token is rejected. This stops a script that fires the form the instant the page loads.
- **Cloudflare Turnstile.** In production the person must pass Cloudflare’s “are you a human?” check. If the Turnstile secret is missing in production, the form refuses to send (it fails closed). In local development the check is skipped when no secret is set.
- **Five messages per hour per IP address.** A sixth attempt in the same hour is told to wait.
- **Email shape and allowed contact choices.** The address must look like an email. The preferred-contact value must be one of the options on the form.

### 4. Risk notes for staff (the message is still saved)

File: `staff-portal/src/lib/contact-risk.ts`

If the text is not blocked, the server still scores it from 0 to 100. Points are added for things like:

- A name that contains a link, a long run of digits, or odd characters
- A disposable inbox (`mailinator.com`, `yopmail.com`, and a short list of similar domains)
- Code-like wording
- Links in the message, especially several links or a very short message that is mostly a link
- The same character repeated many times
- Text that had to be decoded (Base64, gzip, and similar)

A score of 40 or more is marked high risk. The message is still delivered. Staff see a risk number in the inbox. The sender’s IP address is kept only when the score or the flags suggest abuse. Clean messages do not store the IP.

### 5. How staff read it

The inbox shows the subject, name, and message as text (React text, not HTML). A `<script>` that somehow got stored would appear as words on the screen. It would not run. Forwarding to Gmail or Outlook uses a plain-text body, not an HTML email built from the visitor’s message.

Staff must unlock the inbox before names, emails, and message bodies are shown.

## Is it viable?

Yes. For this form the goal is: accept real enquiries, keep scripts from running in the staff portal, and cut down automated junk.

That matches what was built:

- The display path does not run visitor HTML.
- The server repeats the script check so skipping the browser script does not help.
- Common encodings are unwrapped before that check.
- Turnstile, the hidden field, the short wait, and the hourly limit are a normal, practical set of bot controls.
- Tests in `staff-portal/src/lib/security.test.ts` cover plain script tags, HTML-encoded tags, URL-encoded tags, `\x` escapes, Base64, and gzip+Base64, plus the token and Turnstile “fail closed” behaviour.

## Is it reliable?

**Stopping a script from running: reliable.**  
The dependable control is that the message is never turned into a web page. Filtering is extra. Even if a new trick gets past the filter, opening the message in the staff portal does not execute it.

**Blocking every malicious string before it is saved: not fully reliable.**  
The filter is a list of known bad patterns. It is good at the attacks it was written for. It will miss things that are not on the list, for example:

- A tag we did not name, if it does not also contain `on…=` or `javascript:`
- A broken-up tag such as `<scr` + `ipt>` that none of the decoders reassemble
- Encoding stacked in a way the unwrapper does not recognise, or more layers than the 24-step cap
- A normal-looking phishing link. Links raise the risk score. They are not blocked. One link in a real enquiry is common and should not be rejected.

**Stopping bots: reliable enough for a contact form, not a guarantee.**

- Turnstile is the strong part. A human attacker can still pass it and send a message.
- The signed token can be reused until it expires (about 20 minutes). It is not single-use.
- The hidden field only fools programs that fill every input.
- The disposable-email list is only a handful of domains, so most throwaway addresses are not flagged.
- The hourly limit follows the client IP. Someone who changes address can send again. On the VPS, the limit is only as trustworthy as the proxy setup (`TRUSTED_PROXY_HOPS` / `x-real-ip`).

**What you do not get**

- Blocked attempts are not stored. Staff cannot review a script that was refused.
- There is no paid spam service and no malware scan of attachments (this form has no file upload).

## What staff should do

- Treat a high risk score as a warning, not as proof of an attack. Read the message before replying or clicking any link in it.
- Do not copy a suspicious message into a web page or an HTML email.
- A real customer can still write in ALL CAPS, use a long email address, or include one link. Those only add points. They do not block the message.
