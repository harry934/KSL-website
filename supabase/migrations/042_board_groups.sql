-- Board filters such as Defence and Principal Secretaries can be added, renamed, and removed.

alter table public.organization_board_members
  drop constraint if exists organization_board_members_board_group_check;

alter table public.organization_board_members
  add constraint organization_board_members_board_group_check
  check (char_length(btrim(board_group)) between 1 and 40);

alter table public.organization_settings
  add column if not exists board_groups jsonb;

update public.organization_settings
set board_groups = coalesce(board_groups, $groups$[
  {"id":"defence","label":"Defence"},
  {"id":"ps","label":"Principal Secretaries"},
  {"id":"independent","label":"Independent members"}
]$groups$::jsonb)
where id = 'default';
