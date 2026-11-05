-- Board page sections such as Leadership, Audit, Risk, and Strategy.

alter table public.organization_settings
  add column if not exists board_sections jsonb;

update public.organization_settings
set board_sections = coalesce(board_sections, $sections$[
  {"id":"featured","title":"Leadership","blurb":""},
  {"id":"audit","title":"Audit","blurb":"Finance, controls, and public accountability."},
  {"id":"risk","title":"Risk","blurb":"Operational readiness and security."},
  {"id":"strategy","title":"Strategy","blurb":"Industrial growth and long term direction."}
]$sections$::jsonb)
where id = 'default';
