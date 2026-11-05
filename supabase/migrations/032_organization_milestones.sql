-- Major milestones on Who We Are, in the order staff set.

alter table public.organization_settings
  add column if not exists milestones_title text,
  add column if not exists milestones_lead text;

update public.organization_settings
set
  milestones_title = coalesce(milestones_title, 'Major Milestones'),
  milestones_lead = coalesce(milestones_lead, 'From the first yard works to MV Uhuru II entering the water.')
where id = 'default';

create table if not exists public.organization_milestones (
  id uuid primary key default gen_random_uuid(),
  happened_on date not null,
  title text not null,
  summary text,
  image_url text,
  image_alt text,
  image_slot text,
  story_key text,
  tag_label text,
  tag_note text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id) on delete set null
);

alter table public.organization_milestones enable row level security;

drop trigger if exists organization_milestones_updated on public.organization_milestones;
create trigger organization_milestones_updated before update on public.organization_milestones
  for each row execute function public.set_updated_at();

grant all on public.organization_milestones to service_role;

do $$
begin
  if not exists (select 1 from public.organization_milestones) then
    insert into public.organization_milestones (
      happened_on, title, summary, image_url, image_alt, image_slot, story_key, tag_label, tag_note, sort_order, status
    ) values
      ('2018-07-12', 'Mombasa yard begins', 'The slipway site beside the port, later able to take a 4,000 tonne vessel.', 'img/ksl/mombasa.webp', 'Mombasa Shipyard aerial view', 'about.7-mombasa-shipyard-aerial-view', null, null, null, 0, 'published'),
      ('2020-09-29', 'KSL is incorporated', 'A state corporation under the Ministry of Defence, approved by the National Security Council.', 'img/ksl/yard.jpg', 'Shipyard work', 'about.8-shipyard-work', null, null, null, 1, 'published'),
      ('2020-12-08', 'Kisumu is upgraded', 'Dry dock, slipways, and quay prepared for larger vessels on Lake Victoria.', 'img/ksl/kisumu.webp', 'Kisumu Shipyard', 'about.9-kisumu-shipyard', null, null, null, 2, 'published'),
      ('2021-05-31', 'Keel of MV Uhuru II', 'The Kisumu yard is launched and the hull of MV Uhuru II is formally started.', 'img/ksl/ferry.jpg', 'Passenger vessel', 'about.10-passenger-vessel', 'uhuru', 'MV Uhuru II, part 1 of 2', null, 3, 'published'),
      ('2021-12-17', 'Mombasa opens', 'Slipway, buildings, workshops, and cranes are handed over for use.', 'img/ksl/mombasa.webp', 'Mombasa Shipyard', 'about.11-mombasa-shipyard', null, null, null, 4, 'published'),
      ('2022-07-06', 'Locomotives return', 'The same workshops that serve hulls rehabilitate rail equipment.', 'img/ksl/linkspan.webp', 'Heavy engineering works', 'about.12-heavy-engineering-works', null, null, null, 5, 'published'),
      ('2022-08-02', 'Uhuru II floats', 'The hull meets the water, about fourteen months after the keel was laid.', 'img/ksl/ferry.jpg', 'MV Uhuru II programme', 'about.13-mv-uhuru-ii-programme', 'uhuru', 'MV Uhuru II, part 2 of 2', '14 months from keel to water', 6, 'published');
  end if;
end $$;
