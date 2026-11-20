# Deploy home About + What we do changes

Branch: `vps-postgres`  
Repo path on PC: `kenya-shipyards website-vps-postgres`

## What this ships

- Home **About** copy updated; removed “About Kenya Shipyards Limited” heading
- Removed **Shipbuilding and engineering** heading under What we do
- New admin sidebar item **What we do** (under Website) to edit home cards: title, summary, detail, photo, button, link, icon, show/hide, order

---

## On your PC

```bash
cd "/home/harry/Github Projects/kenya-shipyards website-vps-postgres"
git status -sb
git push origin vps-postgres
```

---

## On the VPS

```bash
cd /opt/kenyashipyards/admin-api
# if that folder does not exist:
# cd /opt/ksl-website

git fetch origin
git checkout vps-postgres
git pull origin vps-postgres

# Rebuild staff portal (needed for the new What we do admin page)
cd staff-portal
npm ci
set -a
[ -f /etc/ksl-portal.env ] && . /etc/ksl-portal.env
[ -f .env.production ] && . ./.env.production
set +a
npm run build
cd ..

# Restart portal
bash deploy/vps/restart-portal.sh
# or: pm2 reload ksl-portal

# Publish public HTML / CSS / JS
PUBLIC_DEST=/var/www/kenyashipyards
[ -d "$PUBLIC_DEST" ] || PUBLIC_DEST=/var/www/ksl
DEST="$PUBLIC_DEST" bash deploy/vps/publish-public.sh
```

Or one-shot if your clone already has the update script:

```bash
bash deploy/vps/apply-update.sh 178.162.219.218
```

---

## Check

1. Public: `http://178.162.219.218/index.html#about` — new About text, no extra headings  
2. Public: scroll to **What we do** — cards still show  
3. Admin: `http://178.162.219.218/kwela/` → sidebar **What we do**  
4. Edit a card, save, hard-refresh the home page  

No database migration is required. Cards are stored in `site_settings` under key `what_we_do`. Until you save once in admin, the site uses the defaults baked into the public settings payload / `data/settings.json`.
