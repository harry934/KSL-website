# Kenya Shipyards Limited — website and admin portal

Public site: https://ksl-website.vercel.app/

Staff admin portal: https://ksl-websitekiza.vercel.app/login

One Git repository. Two Vercel projects. Setup and status notes are in `guides/`.

**Production overview and VPS migration:** [guides/PRODUCTION-OVERVIEW-AND-VPS.md](guides/PRODUCTION-OVERVIEW-AND-VPS.md)  
**VPS transfer plan (follow this to move the site):** [guides/VPS-TRANSFER-PLAN.md](guides/VPS-TRANSFER-PLAN.md)  
**VPS regression checklist:** [guides/VPS-MIGRATION-CHECKLIST.md](guides/VPS-MIGRATION-CHECKLIST.md)  
**Burp / pen-test brief:** [guides/BURP-SECURITY-BRIEF.md](guides/BURP-SECURITY-BRIEF.md)

## Folders

| Folder | What it is |
|--------|------------|
| `*.html` at the root | The public pages. The file name is the web address, so these stay here. |
| `css/` | `bootstrap.min.css` (layout toolkit), `style.css` (older template), `ksl.css` (this site's own styles). |
| `js/` | Shared scripts. `js/pages/` is one script per page. `js/scripts.js` loads them. |
| `lib/` | Third-party scripts (carousel, lightbox, animations). Do not edit these. |
| `img/` | Photographs and video used by the pages. |
| `data/` | The JSON the public pages read when the admin portal is unavailable. |
| `docs/` | Files visitors download (plans, forms, the brochure). These addresses are linked from the site, so do not rename them. |
| `guides/` | Notes for the team: deployment, status, and the website proposal. Not published. |
| `staff-portal/` | The Next.js admin portal. Its own readme is `staff-portal/README.md`. |
| `supabase/migrations/` | Database changes, numbered `001` to `039`. Run them in that order. |
| `tools/` | One-off scripts. `tools/scrape/` holds saved copies of old pages used to build the JSON. Not published. |

## Public pages

| File | Page |
|------|------|
| `index.html` | Home |
| `about.html` | About |
| `organization.html` | Organisation |
| `board.html` | Board of directors |
| `service.html` | Services |
| `products.html` | Products |
| `project.html` | Projects |
| `sustainability.html` | Sustainability |
| `csr.html` | Community |
| `careers.html` | Careers |
| `news.html` | News list |
| `article.html` | One news story |
| `event.html` | Events |
| `faq.html` | Questions |
| `downloads.html` | Downloads |
| `videos.html` | Gallery |
| `contact.html` | Contact |
| `404.html` | Page not found |
