-- A milestone can be saved with no date, or with only a year or a month.

alter table public.organization_milestones
  alter column happened_on drop not null;

alter table public.organization_milestones
  alter column title drop not null;

alter table public.organization_milestones
  add column if not exists date_precision text;

alter table public.organization_milestones
  drop constraint if exists organization_milestones_date_precision_check;

alter table public.organization_milestones
  add constraint organization_milestones_date_precision_check
  check (date_precision is null or date_precision in ('year', 'month', 'day'));

update public.organization_milestones
set date_precision = 'day'
where happened_on is not null and date_precision is null;
