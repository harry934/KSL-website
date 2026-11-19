# Kenya Shipyards Limited — website and admin portal

This repository contains the public static website and the Next.js staff portal. On the `vps-postgres` branch the staff portal uses self-hosted PostgreSQL, local authentication, and filesystem storage instead of Supabase.

**VPS production deployment (this branch):** [DEPLOYMENT.md](DEPLOYMENT.md)  
**PostgreSQL schema and migration operations:** [postgres/README.md](postgres/README.md)  
**VPS Stage 1 status:** [guides/VPS-STAGE-1-STATUS.md](guides/VPS-STAGE-1-STATUS.md)  
**Historical Vercel/Supabase deployment notes:** [guides/DEPLOYMENT.md](guides/DEPLOYMENT.md)  
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
| `postgres/` | Standalone PostgreSQL bootstrap SQL, versioned migrations, and operations docs. Use `npm run db:migrate` from `staff-portal/`. |
| `supabase/migrations/` | Historical Supabase SQL archive only. Do **not** apply these to ordinary PostgreSQL. |
| `deploy/vps/` | systemd unit, nginx templates, and public-site publish helper for the VPS. |
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
