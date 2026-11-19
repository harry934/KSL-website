# Historical Supabase migration coverage

Historical files in `../supabase/migrations/` are **source history only**. They must not be run on standalone PostgreSQL because they contain Supabase Auth, Storage, API-role, RPC, and RLS assumptions. The replacement baseline is `migrations/001_standalone_schema.sql`; it is applied only by `staff-portal/scripts/migrate.mjs` under the `ksl_migrator` role.

| Historical file | Schema/data behavior preserved by the standalone baseline | Supabase-only behavior replaced or intentionally omitted |
|---|---|---|
| `001_staff_portal_schema.sql` | `admin_profiles` (with local `password_hash`), module permissions, content modules/seeds, activity, FAQ, news, timestamps | `auth.users`, RLS and API grants replaced by local accounts and server-side authorization |
| `002_gallery_photos.sql` | `gallery_photos`, ordering, caption/category/status data | Storage object policies replaced by filesystem metadata and routes |
| `003_events_services.sql` | event/service tables, settings rows, defaults, updated-at triggers | Public/admin RLS policies replaced by route authorization and published filters |
| `004_careers_downloads.sql` | career/download tables, settings seeds, fields and update triggers | RLS/grants replaced by application checks and signed private-file URLs |
| `005_organization_press.sql` | organization leadership/yards/settings and press settings/assets | RLS/grants replaced by server-only database access |
| `006_products_csr_settings.sql` | products, CSR tables/settings, defaults and update triggers | Supabase function/grants omitted; server-side route authorization replaces them |
| `007_usernames_security.sql` | username constraints, profile flags, login-attempt tracking and indexes | Auth lookup RPC/grants replaced by parameterized PostgreSQL queries |
| `008_gallery_videos.sql` | `gallery_videos`, featured/status fields and ordering | RLS/function/grants replaced by server authorization |
| `009_profile_photos.sql` | `admin_profiles.avatar_path` | Supabase avatar bucket behavior replaced by private filesystem serving |
| `010_board_and_first_login.sql` | board-member records and forced username/password change flags | Auth/RLS/grants replaced by local account/session flow |
| `011_messages_module.sql` | messages module seed and message-access metadata | Supabase function/grants replaced by authenticated server routes |
| `012_download_source_and_site_images.sql` | download source fields and `site_image_overrides` | Storage policies replaced by filesystem object metadata and controlled delivery |
| `013_production_security.sql` | contact-attempt table/index and message protections | RLS policy/grant hardening is unnecessary for a server-only runtime role; application authorization remains mandatory |
| `014_projects_and_board.sql` | projects/settings, board data, content-module seeds and project ordering | Supabase function/grants omitted in favour of database queries in the app |
| `015_news_go_live.sql` | `news_items.go_live_on` | Public route checks status, deletion, and go-live date rather than RLS |
| `016_lock_down_api_grants.sql` | security intent: no public database API access | Supabase role grants/RPC are omitted; `ksl_runtime` is server-only and has no schema privilege |
| `017_one_time_password_expiry.sql` | one-time-password expiry field | Supabase Auth reset handling replaced by local invite/reset flow |
| `018_home_hero_media.sql` | home-hero media/image settings fields | Storage URLs are localized to controlled filesystem routes |
| `019_staff_sessions.sql` | one-row-per-user `staff_sessions`, expiry and session metadata | Supabase sessions replaced by random browser tokens with SHA-256 hashes stored in PostgreSQL |
| `020_portal_care.sql` | support/status history fields and `service_status_log` | managed-service grants omitted; portal reports local storage/database status |
| `021_session_client.sql` | session client-label field | Supabase session client storage replaced by local session record |
| `022_storage_usage.sql` | stored-file metadata supports usage reporting | Supabase Storage RPC omitted; filesystem scanner and metadata compute usage |
| `023_database_size.sql` | dashboard database-size reporting | Supabase RPC omitted; dashboard directly calls PostgreSQL `pg_database_size` through the server pool |
| `024_recycle_bin.sql` | `deleted_at` fields across content tables | RLS behaviour replaced by staff permission checks |
| `025_staff_recycle.sql` | staff/content soft-delete audit fields and related delete behavior | Supabase functions/grants omitted; recycle logic runs through local database queries |
| `026_staff_account_requests.sql` | `staff_account_requests`, constraints and pending-request uniqueness | Auth-dependent requests are processed by local staff management |
| `027_staff_role_title.sql` | profile role-title field and staff activity compatibility | Auth updates replaced by local profile queries |
| `028_storage_objects.sql` | `stored_files` bucket/path/size/content-type metadata | `storage.objects` and bucket grants replaced by filesystem operations under `STORAGE_DIR` |
| `029_staff_invites.sql` | `staff_invites`, token/passcode hashes, expiry, target/creator FK rules and indexes | Supabase invitation/auth user creation replaced by local password/account creation |
| `030_organization_chart.sql` | organization chart data on `organization_settings` | RLS omitted; only server routes expose published data |
| `031_board_sections.sql` | board-section configuration | RLS omitted; server-side public filtering retained |
| `032_organization_milestones.sql` | milestones table, defaults, ordering and update trigger | RLS/grants omitted; application authorization used |
| `033_milestone_optional_date.sql` | optional milestone date/precision fields | No Supabase-specific replacement required |
| `034_organogram_chart.sql` | organogram chart representation in organization settings | No Supabase-specific replacement required |
| `035_group_order.sql` | grouping/order fields and settings data | RLS/grants omitted; server route validates staff permissions |
| `036_drafts_and_usernames.sql` | drafts, username-change flags, uniqueness indexes and update triggers | RLS/grants replaced by role/module permission checks in the portal |
| `037_draft_returns.sql` | draft-return records, reviewer/author `ON DELETE SET NULL`, open-return indexes | RLS/grants replaced by server-side review authorization |
| `038_security_lockdown_followup.sql` | local account/data protections, published-content intent and secure access constraints | Supabase role revokes/default grants/RLS policies intentionally omitted; no browser database access exists |
| `039_projects_details.sql` | project detail field | No Supabase-specific replacement required |
| `040_website_messages_submitter_ip.sql` | message submitter-IP field | IP handling occurs in server route without a public database API |
| `041_website_messages_risk.sql` | message risk/triage fields | No Supabase-specific replacement required |
| `042_board_groups.sql` | board grouping/order fields | No Supabase-specific replacement required |
| `043_official_organogram_structure.sql` | official organogram structure/content in organization settings | No Supabase-specific replacement required |

The baseline deliberately does not seed an administrator. `npm run bootstrap:admin` is the only first-admin path; it uses a transaction-level advisory lock, refuses an existing super-admin, writes a bcrypt cost-12 hash only, and forces a first-login password change.

## Verification boundary

This matrix is a source-to-baseline coverage review, not evidence that historical production data has been imported. Importing content/media requires an authorized export outside Git, and PostgreSQL migration/integration tests require a disposable local PostgreSQL service. Neither is available in this workspace.
