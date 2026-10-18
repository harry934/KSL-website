alter table public.news_items
  add column if not exists go_live_on date;

comment on column public.news_items.go_live_on is
  'When set, a published story stays off the public site until this date in Nairobi.';
