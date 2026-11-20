# Deploy home About + What we do + recycle-bin deletes

Branch: `vps-postgres`  
Repo path on PC: `kenya-shipyards website-vps-postgres`

## What this ships

- Home **About** copy updated; removed “About Kenya Shipyards Limited” heading
- Removed **Shipbuilding and engineering** heading under What we do
- Admin **What we do** editor for home cards
- **All admin content deletes soft-delete into the recycle bin first**; permanent delete only from Recycle bin
- What we do cards stored in `home_what_we_do_items` (migration `004_home_what_we_do.sql`)

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

# Apply DB migration (creates home_what_we_do_items)
cd staff-portal
set -a
[ -f /etc/ksl-portal.env ] && . /etc/ksl-portal.env
[ -f .env.production ] && . ./.env.production
set +a
npm run db:migrate

npm ci
npm run build
cd ..

bash deploy/vps/restart-portal.sh
# or: pm2 reload ksl-portal

PUBLIC_DEST=/var/www/kenyashipyards
[ -d "$PUBLIC_DEST" ] || PUBLIC_DEST=/var/www/ksl
DEST="$PUBLIC_DEST" bash deploy/vps/publish-public.sh
```

---

## Check

1. Public: home About + What we do cards  
2. Admin → **What we do** → trash a card → it appears under **Recycle bin**  
3. Recycle bin → restore works; permanent delete removes it for good  
4. Same soft-delete behaviour for news, services, gallery, etc.
