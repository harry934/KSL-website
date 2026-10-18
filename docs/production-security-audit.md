# Production security review

Reviewed 18 October 2026 against the staff portal, Supabase migrations, and the public website. This report does not change any security settings. Nothing here has been applied.

## How to go to production

Keep the shape you already have.

- Public site on the `ksl-website` Vercel project, served as the static pages.
- Staff portal on the `ksl-website_mink` Vercel project.
- Supabase for accounts, content, and files.
- Point `kenyashipyards.co.ke` and `www` at the public project. Put the staff portal on its own hostname, such as `admin.kenyashipyards.co.ke`, and do not link that hostname from the public site.
- Set production environment variables only in Vercel and Supabase. The service-role key stays on the server. It must not be prefixed with `NEXT_PUBLIC_`.
- Turn on Supabase daily backups before the cutover, and keep a second admin account so one locked login cannot shut the portal.
- After DNS moves, confirm both Vercel projects show a valid certificate and that the public site’s `data-ksl-content-api` still points at the staff portal.

That is enough to launch. The items below should be decided before or soon after launch. They are not blockers for a private preview, and they are not implemented in this change.

## What is already in good shape

- Portal pages redirect to the login screen when there is no signed-in user. Sign-in is limited to 5 failures per username and 20 per address in 15 minutes.
- Staff actions go through the server. The browser does not hold the service-role key. `.env` files are gitignored.
- Row Level Security is on for the content tables. The migrations add public read policies and no public insert, update, or delete policies, so the anon key cannot write those tables.
- Published news, events, services, and similar rows are filtered by status. Draft news is not in the public read policy.
- Uploads are limited to JPG, PNG, WebP, PDF, and Word, with size caps, and only a signed-in editor for that module can upload.
- The staff portal sends a content security policy, `X-Frame-Options: DENY`, `nosniff`, and HSTS.
- The contact form checks the fields, clips long text, and only accepts listed ways of being contacted. Browser calls are limited to the public site and local development.

## Findings

### 1. Uploaded documents are world-readable

Downloads that use Storage are uploaded to the public `media-public` bucket. Anyone who has the file address can open a PDF or Word file without signing in. A private `downloads` bucket already exists in the first migration and is unused.

Before production, new documents should go into the private bucket and be opened with a short-lived link. Images that are meant to appear on the website can stay public.

### 2. News and other saved HTML is inserted as written

A published news story’s body is placed into the page with `innerHTML` in `js/pages/article.js`. There is no sanitiser. A staff member who can publish news can put script in a story, and every visitor would run it. The same pattern is worth checking anywhere else saved HTML is printed.

Before production, clean saved HTML on the way out, and allow only the tags the editor actually produces.

### 3. The contact form can be flooded

`POST /api/public/contact` has no limit per address and no check that a person sent it. A script can fill the inbox.

Add a small limit per address, and a challenge if the inbox starts filling with junk.

### 4. Some settings tables are readable in full by the anon key

`downloads_settings`, `products_settings`, `csr_settings`, and `site_image_overrides` allow any holder of the anon key to read every row. The public API already returns the public parts. The extra risk is rows that were never meant to be public, including draft product or community settings, because those policies do not check status.

Tighten those policies to published rows only, or drop direct anon access and keep reading behind the public API.

### 5. The public website sends almost no security headers

`vercel.json` on the public site only sets a cache header for intro videos. It does not set `nosniff`, a frame policy, or a content security policy. The staff portal already does.

Add the same class of headers on the public project. A strict content security policy needs a pass over the Google font and translate scripts so it does not break the pages.

### 6. Portal API routes are protected one by one

The middleware covers pages and `/api/public/*`. Other `/api` routes are excluded and each handler calls `requireStaff`. That works for the routes that do it. A new route that forgets the check would be open.

A later change can refuse `/api` requests that have no session, with an exception list for the public routes.

### 7. There are no storage policies in the migrations

The buckets are created, but no `storage.objects` policies are in the SQL. Uploads today go through the service role, which bypasses those policies. If the Supabase dashboard was ever given an anon upload policy, visitors could write into `media-public`.

Confirm in the Supabase dashboard that anon and authenticated users cannot insert, update, or delete objects. Public read of `media-public` is expected. The private `downloads` bucket should not be public.

## Website images and downloads, as shipped with this work

- A download is either Standard (file name under the docs folder) or Storage (uploaded file). Existing documents were marked Storage only when they already had an external address.
- Photos on the public pages are slots. Nothing changes until an administrator with site-settings publish rights uploads or picks a stored image. “Use shipped photo” removes that override.
- The public image endpoint returns only those replaced addresses. If it fails, the pages keep the files they shipped with.

## Suggested order once you approve fixes

1. Confirm storage policies in the Supabase dashboard, and turn on backups.
2. Attach the custom domain and the admin hostname. Set production env vars.
3. Move new documents to the private bucket.
4. Sanitise published HTML.
5. Limit the contact form.
6. Add security headers on the public site.
7. Narrow the anon read policies that ignore draft status.
