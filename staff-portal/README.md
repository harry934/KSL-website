# KSL Content portal (staff)

Private admin for Kenya Shipyards website content. **Do not** deploy on a hostname containing `admin`. Use an unguessable URL and do not link from the public site.

## Cursor + Supabase MCP

This repo includes [`.cursor/mcp.json`](../.cursor/mcp.json) for the Supabase MCP server (project `envqgczfhxywkxcnsxrt`). After reloading Cursor:

1. Approve the server when prompted (or run `cursor agent mcp enable supabase`).
2. Authenticate: `cursor agent mcp login supabase`
3. Verify: `cursor agent mcp list`

Optional: `npx skills add supabase/agent-skills` for Supabase-focused agent skills.

## Setup

1. **Supabase SQL** — In [Supabase Dashboard](https://supabase.com/dashboard) → SQL → New query, run the full script:
   `../supabase/migrations/001_staff_portal_schema.sql`

2. **Environment** — Copy `.env.example` to `.env.local` (already configured locally; never commit `.env.local`).

3. **First super admin** (after SQL succeeds):
   ```bash
   cd staff-portal
   node scripts/bootstrap-super-admin.mjs your@email.com YourSecurePassword "Your Name"
   ```

4. **Run locally**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000/login

## Security

- Rotate the **service role** key if it was ever shared in chat or email.
- Enable MFA for super admins in Supabase Auth when available.
- Deploy to a dedicated Vercel project with `X-Robots-Tag: noindex` (middleware sets this).

## Modules

| Status | Module |
|--------|--------|
| Live | Staff (super admin), FAQ |
| Planned | News, events, gallery, services, careers, … |

Import FAQ from the main site JSON:
```bash
node scripts/import-faq-from-json.mjs
```
