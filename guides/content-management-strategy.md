# Kenya Shipyards Website Content Management Strategy

**Status:** Recommended  
**Decision date:** 28 September 2026  
**Scope:** Website content editing, publishing, and Linux VPS operations

## Executive decision

Kenya Shipyards Limited should **not build a custom administration system at this stage**.

The recommended approach is:

1. Keep the public website as static files served by Nginx on the Linux VPS.
2. Keep Git as the authoritative source, audit trail, and rollback mechanism.
3. Make routine content changes in the existing files under `data/`.
4. Use a reviewed deployment process from Git to a separate public web directory.
5. Introduce a lightweight Git based content editor later if nontechnical staff need to publish without editing JSON.
6. Consider a custom administration system only after publishing volume, approval requirements, or editor numbers prove that it is necessary.

This approach gives the company the lowest operational risk today without preventing a CMS or administration portal from being added later.

## Assumptions behind the decision

This recommendation assumes:

- A small number of people are responsible for website updates.
- Most updates are planned rather than urgent, continuous publishing.
- A developer or trained web officer can review changes before they go live.
- The website does not currently require private user accounts, payments, or protected customer data.
- Formal multi department approval and scheduled publishing are not yet required.

The decision should be reviewed if these assumptions change.

## Current website architecture

The current website is a static, multi page site. It does not have a server application, database, user authentication system, or package based build process.

### Content already stored as structured data

Routine content is already partly separated from page code:

- `data/news.json` contains news articles.
- `data/faq.json` contains frequently asked questions.
- `data/careers.json` contains vacancies and career information.
- `data/events.json` contains event information.
- `data/downloads.json` contains document metadata and links.
- `data/gallery.json` contains gallery and video entries.
- `data/press.json` contains press information.
- `data/organization.json` contains selected organization information.
- `data/services.json` contains detailed service content used by service popups.

Page scripts under `js/pages/` fetch these files and render their content in the browser. `js/scripts.js` selects the appropriate page script through the page's `data-ksl-page` attribute.

### Content still embedded in code

Several areas still require HTML or JavaScript knowledge:

- About, board, products, projects, corporate social responsibility, sustainability, and contact content are embedded in HTML pages.
- Service cards are stored in HTML while detailed service text is stored in `data/services.json`.
- The featured event page combines HTML and `data/events.json`.
- Navigation, contact details, download links, and footer content are repeated across many HTML files.
- English to Kiswahili interface translations are maintained in `js/lang.js`.
- Layout and behaviour changes require work in `css/ksl.css` and JavaScript files.

An administration system added now would therefore manage only part of the website unless the site were first restructured around a single content model.

## Option 1: Continue editing through Git and structured files

### Why this is the best current option

- It matches the architecture that already exists.
- It requires no database, backend service, or administration server.
- Git records who changed what and when.
- Every release can be reviewed before deployment.
- A previous working version can be restored quickly.
- The public website remains fast and has a small attack surface.
- Nginx can serve the site without Node.js, PHP, or a long running application process.
- Hosting and maintenance costs stay low.

### Limitations

- Editors need basic Git and JSON training.
- Invalid JSON can stop a dynamic section from loading.
- HTML pages are not safe for untrained editors to change directly.
- Images and documents require a clear upload and naming process.
- Services and events currently have more than one source of truth.
- Repeated navigation and footer markup makes company wide changes inefficient.

### Controls that make this workflow safe

- Give editors access only through a branch or pull request workflow.
- Protect the production branch from direct changes.
- Validate JSON before deployment.
- Publish to a staging address before production.
- Keep a short content editing guide with examples for every JSON file.
- Require review for changes that touch HTML, CSS, or JavaScript.
- Use Git tags or commit identifiers for every production release.

## Option 2: Add a lightweight Git based CMS

A Git based CMS provides browser forms that update files in the repository and create commits. It can be limited to content under `data/` and selected media folders.

### Why it could be useful

- Nontechnical staff can use forms instead of editing JSON.
- Changes still retain Git history and rollback.
- The public site can remain static.
- It can be introduced gradually, starting with news, careers, events, FAQs, and downloads.
- Field validation can reduce malformed content.
- A preview workflow can be connected to a staging site.

### Why it should be a later step

- The current content schemas should be cleaned up first.
- Services and events still have duplicate content sources.
- Global navigation and footer information are not data driven.
- Authentication and repository permissions still need configuration.
- Media uploads need a storage and backup policy.
- A Git based editor does not automatically make every HTML page editable.

This is the preferred next step if the company wants nontechnical editing. It is significantly smaller and safer than building a custom administration system.

## Option 3: Use a self hosted headless CMS

A headless CMS such as Directus, Strapi, or Payload would store content in a database and expose it through an API.

### Benefits

- Good interfaces for editors.
- Roles, permissions, media management, and structured content.
- Better support for approval workflows and multilingual content.
- Suitable when several channels need to use the same content.

### Costs and risks

- The VPS must run and secure an additional application and database.
- Database, media, and configuration backups become mandatory.
- The website must be changed to consume an API or receive exported static content.
- CMS upgrades and security patches become ongoing responsibilities.
- API or database outages can affect publishing and possibly the public website.
- More server memory, monitoring, and operational knowledge are required.

A headless CMS is reasonable only when content operations have outgrown a Git based editor.

## Option 4: Build a custom administration system

### When a custom admin would be useful

A custom admin becomes valuable when the company needs capabilities that simpler tools cannot provide, such as:

- Several departments publishing independently.
- Role based access with different permissions.
- Draft, review, approval, scheduling, and expiry workflows.
- A large searchable media library.
- Structured English and Kiswahili content for every item.
- Detailed audit reports required by policy or regulation.
- Integration with internal identity systems.
- Integration with procurement, careers, records, or other company systems.
- High publishing frequency where developer involvement causes delays.

### Why it is not justified now

A custom admin is not merely an editing page. It creates another production software system that must include:

- Secure login, password policy, account recovery, and session handling.
- Role and permission management.
- Input validation and safe rich text handling.
- Protection against cross site scripting, request forgery, brute force attacks, and malicious uploads.
- Database design, migrations, backups, and recovery testing.
- Image and document upload limits, virus checking, file naming, and storage.
- Audit logging.
- Conflict handling when two editors change the same content.
- Staging, testing, monitoring, patching, and incident response.
- A reliable method to synchronize admin changes with the static website.

If the admin writes directly into the public web directory, accidental or malicious changes can become live immediately and may be lost during the next Git deployment. If it writes Git commits, it must securely manage repository credentials, conflicts, branches, and deployment triggers. If it stores content in a database, the frontend must be redesigned around that database or an API.

Building all of this before the company needs it would increase cost and risk without providing enough additional value.

## Content ownership model

### Suitable for trained content editors

These files should be the first supported editorial surface:

- `data/news.json`
- `data/faq.json`
- `data/careers.json`
- `data/events.json`
- `data/downloads.json`
- `data/gallery.json`
- `data/press.json`

Editors should receive field examples, allowed image locations, and validation checks.

### Requires developer review

These areas currently require technical review:

- Root HTML pages.
- `data/services.json` together with service card HTML.
- The featured event HTML together with `data/events.json`.
- Organization chart layout.
- Navigation and footer changes.
- Contact details repeated across pages.
- English to Kiswahili mappings in `js/lang.js`.
- CSS, JavaScript, accessibility, responsive design, and new page templates.

## Recommended Linux VPS operating model

### Public serving

- Use Nginx to serve a dedicated release directory.
- Do not expose the repository's `.git` directory through the web server.
- Run Nginx with read only access to published files.
- Enable TLS with automatic certificate renewal.
- Compress text assets and apply security headers.
- Cache versioned images, CSS, JavaScript, and videos for longer periods.
- Keep shorter cache periods for JSON content unless JSON URLs are versioned.

### Deployment

The safest model is:

1. An editor or developer creates a branch.
2. The change is reviewed and merged.
3. Automated checks validate JSON and internal links.
4. The site is published to a staging address.
5. An approved commit is copied to a new release directory on the VPS.
6. A `current` symbolic link is switched to the new release.
7. Rollback switches the link back to the previous release.

The private repository checkout or CI runner should be separate from the Nginx document root. A simple `git pull` inside the public directory is possible, but it is less controlled and can briefly expose incomplete changes.

### Media and documents

- Move important documents away from the legacy WordPress upload path.
- Store small, stable assets in the repository.
- Store large or frequently replaced media in a dedicated VPS media directory or object storage.
- Back up media separately because Git history alone may not protect external files.
- Restrict upload permissions to the deployment process or future CMS, not the public web server.

### Backups and recovery

- Git provides the primary backup for source and structured content.
- Keep an off site mirror of the repository.
- Back up locally hosted images and documents.
- Test restoration instead of only checking that backup jobs ran.
- Retain several previous release directories for rapid rollback.

## Recommended staged roadmap

### Stage 1: Stabilize the current workflow

- Host the site statically through Nginx.
- Define branch, review, staging, deployment, and rollback procedures.
- Add JSON and link validation.
- Document content fields and image rules.
- Train one or two responsible content editors.

### Stage 2: Remove duplicate content sources

- Render service cards from `data/services.json`.
- Render the featured event from `data/events.json`.
- Move shared contact, navigation, and footer values into one source.
- Move important documents from the old WordPress media path.
- Decide how full bilingual content will be maintained.

### Stage 3: Add a lightweight editing interface if needed

- Add a Git based CMS for approved JSON collections.
- Limit permissions to editorial files and media.
- Keep pull request review and staging.
- Measure publishing frequency, errors, and time saved.

### Stage 4: Reconsider a custom admin

Only start a custom admin or headless CMS project when measured needs show that the Git based process is insufficient.

## Decision review triggers

Review this decision when any two of the following are true:

- More than two nontechnical staff members publish content regularly.
- The site receives more than eight substantial content updates per month.
- Content only changes consume more than two developer hours per week.
- Draft review, approval, scheduling, or automatic expiry becomes mandatory.
- Different departments require separate permissions.
- Every item must have managed English and Kiswahili versions.
- Media volume becomes difficult to manage through folders and Git.
- Compliance requires detailed publishing audit reports.
- Content must be shared with mobile applications or other systems.

## Final conclusion

Editing this website through Cursor or another code editor is currently the most practical approach because the site is already static, much of its recurring content is in JSON, and Git provides review and rollback without adding server complexity.

The company should avoid unrestricted direct edits on the production VPS. Changes should flow through Git, validation, staging, and an approved deployment.

If easier editing becomes necessary, the next investment should be a lightweight Git based CMS over the existing structured content. A custom admin should remain a later option, justified by real editorial volume and governance requirements rather than built in anticipation of them.
