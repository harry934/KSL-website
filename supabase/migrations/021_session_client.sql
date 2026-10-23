alter table public.staff_sessions
  add column if not exists client_label text;

comment on column public.staff_sessions.client_label is
  'Browser recorded when this session was opened, such as Chrome on a computer.';
