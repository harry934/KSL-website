-- Projects can be edited like services and products. Website board members can be edited and deleted.
insert into public.content_modules (key, label, sort_order)
values ('projects', 'Projects', 55)
on conflict (key) do nothing;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  category text not null,
  category_label text not null,
  image_path text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.projects enable row level security;
drop trigger if exists projects_updated on public.projects;
create trigger projects_updated before update on public.projects
  for each row execute function public.set_updated_at();
grant all on public.projects to service_role;

insert into public.projects (slug, title, subtitle, category, category_label, image_path, sort_order, status)
values
  ('mv-uhuru-ii', 'MV Uhuru II', 'New build', 'ship-construction', 'Ship Construction', 'img/ksl/mombasa.webp', 0, 'published'),
  ('29m-passenger-ferry', '29M Passenger Ferry', 'New build', 'ship-construction', 'Ship Construction', 'img/ksl/kisumu.webp', 1, 'published'),
  ('81-passenger-ferry', '81 Passenger Ferry', 'New build', 'ship-construction', 'Ship Construction', 'img/ksl/linkspan.webp', 2, 'published'),
  ('grp-boats-kisumu-county', 'GRP Boats - Kisumu County', 'New build', 'ship-construction', 'Ship Construction', 'img/ksl/ferry.jpg', 3, 'published'),
  ('grp-boats-siaya-county', 'GRP Boats - Siaya County', 'New build', 'ship-construction', 'Ship Construction', 'img/ksl/fishing.jpg', 4, 'published'),
  ('mv-uhuru-i', 'MV Uhuru I', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/ambulance.jpg', 5, 'published'),
  ('barge-alpha-stone-t', 'Barge Alpha Stone T', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/yard.jpg', 6, 'published'),
  ('uvuvi-i', 'Uvuvi I', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/mombasa.webp', 7, 'published'),
  ('mv-ali-26', 'MV Ali 26', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/kisumu.webp', 8, 'published'),
  ('alpha-3000-barge', 'Alpha 3000 Barge', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/linkspan.webp', 9, 'published'),
  ('fv-kivu', 'FV Kivu', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/ferry.jpg', 10, 'published'),
  ('tug-boat-kiboko', 'Tug Boat Kiboko', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/fishing.jpg', 11, 'published'),
  ('mv-kilimanjaro', 'MV Kilimanjaro', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/ambulance.jpg', 12, 'published'),
  ('kns-imara', 'KNS Imara', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/yard.jpg', 13, 'published'),
  ('pilot-boat-malkia', 'Pilot Boat Malkia', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/mombasa.webp', 14, 'published'),
  ('barge-alpha-stone-town', 'Barge Alpha Stone Town', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/kisumu.webp', 15, 'published'),
  ('mv-nyayo', 'MV Nyayo', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/linkspan.webp', 16, 'published'),
  ('mv-likoni', 'MV Likoni', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/ferry.jpg', 17, 'published'),
  ('kns-shupavu', 'KNS Shupavu', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/fishing.jpg', 18, 'published'),
  ('mv-ikraam-i', 'MV Ikraam I', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/ambulance.jpg', 19, 'published'),
  ('wave-ii-baseterre', 'Wave II Baseterre', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/yard.jpg', 20, 'published'),
  ('mv-chamaunga', 'MV Chamaunga', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/mombasa.webp', 21, 'published'),
  ('pilot-boat-tangulizi-ii', 'Pilot Boat Tangulizi II', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/kisumu.webp', 22, 'published'),
  ('kra-002', 'KRA 002', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/linkspan.webp', 23, 'published'),
  ('fagio-ii', 'Fagio II', 'Repair and overhaul', 'maintenance', 'Maintenance, Repair and Overhaul', 'img/ksl/ferry.jpg', 24, 'published'),
  ('krc-workshop', 'KRC Workshop', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/fishing.jpg', 25, 'published'),
  ('kpa-homabay-pier', 'KPA Homabay Pier', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/ambulance.jpg', 26, 'published'),
  ('kisumu-port-linkspan', 'Kisumu Port Linkspan', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/yard.jpg', 27, 'published'),
  ('marine-rescue-and-coordination-center', 'Marine Rescue and Coordination Center', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/mombasa.webp', 28, 'published'),
  ('kichinjio-landing-site', 'Kichinjio Landing Site', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/kisumu.webp', 29, 'published'),
  ('nanga-landing-site', 'Nanga Landing Site', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/linkspan.webp', 30, 'published'),
  ('dredging-of-kisumu-port', 'Dredging of Kisumu Port', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/ferry.jpg', 31, 'published'),
  ('upgrade-of-kisumu-shipyard', 'Upgrade of Kisumu Shipyard', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/fishing.jpg', 32, 'published'),
  ('construction-of-mombasa-shipyard', 'Construction of Mombasa Shipyard', 'Marine works', 'civil-works', 'Civil and Modular Works', 'img/ksl/ambulance.jpg', 33, 'published'),
  ('remanufacture-of-locomotives', 'Remanufacture of Locomotives', 'Heavy plant', 'heavy-engineering', 'Heavy Engineering', 'img/ksl/yard.jpg', 34, 'published'),
  ('rehabilitation-of-locomotives', 'Rehabilitation of Locomotives', 'Heavy plant', 'heavy-engineering', 'Heavy Engineering', 'img/ksl/mombasa.webp', 35, 'published'),
  ('rehabilitation-of-battle-tanks', 'Rehabilitation of Battle Tanks', 'Heavy plant', 'heavy-engineering', 'Heavy Engineering', 'img/ksl/kisumu.webp', 36, 'published')
on conflict (slug) do nothing;

alter table public.organization_board_members
  add column if not exists section text not null default 'audit',
  add column if not exists bio text;

insert into public.organization_board_members (full_name, role, board_group, section, summary, bio, photo_url, sort_order, status)
select v.full_name, v.role, v.board_group, v.section, v.summary, v.bio, v.photo_url, v.sort_order, v.status
from (values
  ('Gen C M Kahariri EGH CBS ‘nwc’ (USA) ‘psc’ (K)', 'Chief of the Defence Forces', 'defence', 'featured', 'Holds a Diploma in Strategic and Security Studies from the United States Naval War College.', 'Gen Kahariri is the Chief of the Defence Forces.

He holds a Diploma in Strategic and Security Studies from United States Naval War College.

He has completed numerous local and international courses to build his capacity and enhance his skills in the dispensation of Service duties. Some of these courses are

- the Long Navigation Course (India)
- Management and Strategic Planning Course
- Naval Command Course (USA)
- Senior Strategic Leadership Course (UK)
- Executive Development Course (University of N/Carolina, USA)

He has served as an observer, military information officer and held various appointments in leadership, command and management positions.', 'img/ksl/board/gen-kahariri.jpg', 0, 'published'),
  ('Maj Gen S M Farah, CBS ‘rcds’ (UK) ‘psc’ (UG)', 'Managing Director, KSL', 'defence', 'featured', 'Previously served as Vice Chancellor of the National Defence University to Kenya.', 'Maj Gen S M Farah is the Managing Director, KSL.

Prior to his current appointment, he was the Vice Chancellor at the National Defence University – Kenya.

He holds

- a Diploma in Security Management
- Bachelor of Science in Security Management (Egerton University)
- Master of Arts in International Security and Strategy (Kings College)
- Diploma in Human Resource Management from Cambridge Academy', 'img/ksl/board/maj-gen-farah.png', 1, 'published'),
  ('Dr. Patrick Mariru, PhD, CBS', 'Board member', 'independent', 'audit', 'An Advocate of the High Court of Kenya with qualifications in law, public policy and management, and divinity.', 'Dr Mariru is the Principal Secretary, MOD.

He is an advocate of the High Court of Kenya.

He holds

- a diploma in law
- bachelor’s degree in law
- master’s degree in public policy and management
- master’s degree in divinity

He also holds a PhD in leadership and governance and a master’s degree in sustainable development.

He is a dedicated public policy and management expert with local, national and international experience of over 15 years in

- public policy development
- community engagement
- program development
- supporting national government initiatives', 'img/ksl/board/dr-patrick-mariru.jpg', 2, 'published'),
  ('Dr Chris Kiptoo CBS', 'Principal Secretary, National Treasury', 'ps', 'audit', 'Holds a PhD in international macroeconomics with a specialization in finance.', 'Dr. Kiptoo is the Principal Secretary at the National Treasury.

He holds a PhD in international macroeconomics, finance specialization, and master’s and bachelor’s degrees in economics from Egerton University.

He has vast experience in economics, having served at

- CBK
- IMF
- as the economic adviser to the former prime minister', 'img/ksl/board/dr-chris-kiptoo.jpeg', 3, 'published'),
  ('Mr. Simon Mwachia', 'Board member', 'independent', 'audit', 'Holds a Bachelor of Education in Economics and Business Studies and training in strategic leadership development.', 'I hold a Bachelors degree in Education (Arts) in Economics and business studies from the University of Nairobi.

I also have

- a Certificate in Strategic Leadership Development Plan (SLDP)
- Integrated Financial Management Information System (IFMIS) all from Kenya School of Government.

In addition, I have a certificate in Corporate Governance from Centre of Corporate Governance and I am a trained professional teacher among other qualifications.

Over time, I have had a distinguished career experience of more than fifteen (20) years at senior management level in both public and private sector.

I have worked in a senior position in the County Government of Taita Taveta as a Chief Officer in Trade, Cooperatives and Tourism, Education Libraries and ICT and later due to my outstanding performance, I was deployed to handle the department of Devolution Public Service and Administration.

Accordingly, in each stated department, I was the substantive Accounting and Authorized officer, charged with the responsibility of ensuring the achievement of the County government goals and objectives as well as inter-governmental programmers are realized in line with the budget.

I also worked as a director Coast Water Works Development Agency where, I actively participated in Policy Formulation, Strategic Direction and Implementation for improved service delivery.

I have also worked as a County Coordinator National Lands Commission (NLC) where I was entrusted with a large team below my purview.

I provided effective leadership and good governance specifically while settling public land matters in line with the Commissions mandate.', 'img/ksl/board/simon-mwachia.jpg', 4, 'published'),
  ('Lt Gen J M Omenda EBS SS OGW ‘rcds’ (UK) ‘psc’ (K)', 'Vice Chief of the Defence Forces', 'defence', 'risk', 'A graduate of the Defence Staff College of Kenya and the Royal College of Defence Studies, United Kingdom.', 'Lt Gen J M Omenda is Vice Chief of the Defence Forces.

He is a graduate of Defence Staff College of Kenya and Royal College of Defence Studies, UK.

He holds

- a Diploma in Strategic Studies
- Bachelor of Arts in Peace and Conflict studies
- Master of Arts in International Security and Strategy

He has held various appointments in training, command and staff duties.', 'img/ksl/board/lt-gen-omenda.png', 5, 'published'),
  ('Lt Gen D K Ketter MGH CBS ‘ndc’ (TZ) ‘psc’ (K)', 'Commander of the Kenya Army', 'defence', 'risk', 'Holds a Master of Military Science, a Bachelor of Military Science, and a Diploma in Strategic Studies.', 'Lieutenant General David Kipkemboi Ketter is a seasoned and highly accomplished officer in the Kenya Defence Forces.

He was promoted to the rank of Lieutenant General and appointed to this prestigious position on 27 June 2025, following a distinguished career spanning more than three decades in military service.

He commissioned on 3rd August 1990 and began his military career as a young Officer in the Kenya Army Artillery Corps and later joined Kenya Army Ordnance Corps.

Through hard work, loyalty, and professional excellence, he steadily rose through the ranks, serving in various command, staff and instructional roles that have shaped his broad strategic perspective and operational depth.', 'img/ksl/board/lt-gen-ketter.jpeg', 6, 'published'),
  ('Maj Gen B Waliaula MGH CBS ‘ndu’ (China) ‘psc’ (K) ‘acsc’ (USA)', 'Board member', 'defence', 'risk', 'Brings nearly four decades of distinguished service, leadership, professionalism, and commitment to duty.', 'Major General Bernard Waliaula has a distinguished career spanning nearly four decades of dedicated service marked by exceptional leadership, professionalism, and commitment to duty.

He is an alumnus of the College of Defence Studies, China, where he earned a Masters Degree in the Science of National Security Strategy, and Air University, United States, from which he holds a Master’s Degree in Military Operational Art and Science.

In addition to these academic achievements, he has completed various Military Courses across different levels, enriching his operational expertise and strategic leadership capabilities.', 'img/ksl/board/maj-gen-waliaula.jpeg', 7, 'published'),
  ('Maj Gen Paul O Otieno EBS ‘ndc’ (K) ‘psc’ (K)', 'Commander of the Kenya Navy', 'defence', 'risk', 'Holds a master’s degree in physics, specializing in electronics, from Kenyatta University.', 'Maj Gen Paul O Otieno is the Commander Kenya Navy.

He holds a master’s degree in physics (Electronics) from Kenyatta University.

He holds a Diploma and Higher National Diploma in Electrical and Electronic Engineering and a Diploma in Strategic Studies.

He has undertaken requisite military training including

- Regimental Staff Officers’ Course
- Senior Command and Staff course (2006)
- Strategic Military Intelligence Course
- the Security and Strategic Studies at the National Defence College

He has also undertaken professional training certifications including

- Advance Research Design and Engineering
- Social Science Research and Governance
- Diplomacy for Peace and Security
- Regional Senior Mission Leaders’ Training

Maj Gen Otieno was the founding Managing Director of Kenya Shipyards Limited.

He has held various appointments in training, command and staff duties.', 'img/ksl/board/maj-gen-otieno.jpg', 8, 'published'),
  ('Dr Juma Mukhwana HSC', 'Principal Secretary, State Department of Industry', 'ps', 'strategy', 'Holds qualifications in soil science, pharmacology and toxicology, and veterinary medicine.', 'Dr. J. Mukhwana is the Principal Secretary in the State Department of Industry.

He holds

- a PhD in soil science
- a master’s degree in pharmacology and toxicology
- a bachelor’s degree in veterinary medicine

He has worked in the public and private sectors for over 20 years and has been instrumental in developing and implementing policies to support local manufacturing.

He represents the country in the United Nations Industrial Development Organization (UNIDO).

Dr. Mukhwana is an accomplished leader, passionate speaker, and powerful change agent.', 'img/ksl/board/dr-juma-mukhwana.jpeg', 9, 'published'),
  ('Major General Faustino Lobaly', 'Director General, National Security Industries', 'defence', 'strategy', 'Leads the Directorate of National Security Industries and its strategic national development mandate.', 'He is the Director General, Directorate of National Security Industries.

DNSI oversees these SAGAs, which play a vital role in supporting national development and promoting self-sufficiency in resources, equipment, and materials for the KDF.', 'img/ksl/board/maj-gen-faustino-lobaly.jpeg', 10, 'published'),
  ('Ms Maryanne Karanja', 'Board member', 'independent', 'strategy', 'A business leader with more than 20 years of experience in supply chain and business strategy across Africa.', 'Ms M Karanja is a business leader with over 20 years’ track record in Supply Chain, business strategy development and execution support across Africa.

She has vast experience in

- Strategy Development
- Team Leadership
- Supply Chain Management
- Project Management
- Financial Management

She holds a B. Com (Finance and Banking major), MBA (Henley, UK) and is a Fellow of CIPS (UK) with an Accountancy qualification, CPA (K).

She is a member of the Institute of Directors of Kenya (IOD) and the Women on Boards Network (WOBN).', 'img/ksl/board/maryanne-karanja.jpg', 11, 'published')
) as v(full_name, role, board_group, section, summary, bio, photo_url, sort_order, status)
where not exists (
  select 1 from public.organization_board_members existing where existing.photo_url = v.photo_url
);

insert into public.admin_module_permissions (profile_id, module_key, can_view, can_edit, can_publish, can_delete)
select profile_id, 'projects', can_view, can_edit, can_publish, can_delete
from public.admin_module_permissions
where module_key = 'products'
on conflict (profile_id, module_key) do nothing;

create or replace function public.portal_content_counts()
returns table (module_key text, published bigint, draft bigint)
language sql
stable
security definer
set search_path = public
as $$
  select 'news', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from news_items
  union all select 'events', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from event_items
  union all select 'gallery',
    (select count(*) from gallery_photos where status = 'published') + (select count(*) from gallery_videos where status = 'published'),
    (select count(*) from gallery_photos where status = 'draft') + (select count(*) from gallery_videos where status = 'draft')
  union all select 'services', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from service_items
  union all select 'products', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from products
  union all select 'projects', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from projects
  union all select 'careers', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from career_listings
  union all select 'faq', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from faq_items
  union all select 'csr', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from csr_projects
  union all select 'downloads', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from download_items
  union all select 'organization',
    (select count(*) from organization_leadership where status = 'published') + (select count(*) from organization_board_members where status = 'published'),
    (select count(*) from organization_leadership where status = 'draft') + (select count(*) from organization_board_members where status = 'draft')
  union all select 'press', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from press_assets
  union all select 'site_settings', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from site_settings
  union all select 'messages',
    count(*) filter (where read_at is null),
    count(*) filter (where read_at is not null)
    from website_messages
  union all select 'staff', count(*) filter (where is_active), count(*) filter (where not is_active) from admin_profiles
$$;

revoke all on function public.portal_content_counts() from public, anon, authenticated;
grant execute on function public.portal_content_counts() to service_role;
