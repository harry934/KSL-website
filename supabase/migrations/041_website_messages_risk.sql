alter table public.website_messages
  add column if not exists risk_score smallint,
  add column if not exists risk_flags text[] not null default '{}';

comment on column public.website_messages.risk_score is 'Heuristic abuse score 0–100 at submit time.';
comment on column public.website_messages.risk_flags is 'Machine-readable risk flags for staff triage.';
