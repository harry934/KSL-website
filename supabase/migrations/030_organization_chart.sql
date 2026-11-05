-- The organisation chart visitors see, stored in page order.

alter table public.organization_settings
  add column if not exists intro_kicker text,
  add column if not exists intro_title text,
  add column if not exists intro_body text,
  add column if not exists chart jsonb;

update public.organization_settings
set
  intro_kicker = coalesce(intro_kicker, 'Governance and operations'),
  intro_title = coalesce(intro_title, 'How Kenya Shipyards Limited is structured'),
  intro_body = coalesce(intro_body, 'The Board provides governance oversight, while the Managing Director leads nine departments responsible for KSL’s shipbuilding, engineering, commercial, assurance, and corporate functions.'),
  chart = coalesce(chart, $chart${
    "boardCaption": "Governance",
    "boardTitle": "Board",
    "executiveCaption": "Executive leadership",
    "executiveTitle": "Managing Director",
    "departments": [
      {"id":"dept-01","title":"Corporation Secretary and Legal Services","units":["Legal Services Division","Board Secretarial Unit","Compliance & Ethics Unit"]},
      {"id":"dept-02","title":"Production","units":["Engineering Design & Work Preparation Division","New Build, Refit & Conversion Division","Civil & Modular Works Division","Yard Management Division"]},
      {"id":"dept-03","title":"Maintenance, Repair & Overhaul","units":["Work Planning & Preparation Division","MRO Project Management Division"]},
      {"id":"dept-04","title":"Commercial Services","units":["Business Development Division","Marketing & Sales Division"]},
      {"id":"dept-05","title":"Strategy & Quality Assurance","units":["Strategy Planning & Performance Division","QMS & Risk Coordination Division","Inspection Division","Measurement Division","Commissioning Division","Non Destructive Testing Unit"]},
      {"id":"dept-06","title":"Supply Chain Management","units":["Technical Procurement Division","Logistics & Transport Division","Warehousing Division","Administrative Procurement Unit"]},
      {"id":"dept-07","title":"Finance, Accounts & Information Technology","units":["Financial Planning, Budgeting & Reporting Division","Accounting Division","Financial Controls Division","Information Technology Division","Project Financing Unit"]},
      {"id":"dept-08","title":"Corporate Services","units":["Administration & Security Division","Corporate Communications Division","Human Resources Division","Occupational Health, Safety & Environment Division"]},
      {"id":"dept-09","title":"Internal Audit & Risk Assurance","units":[]}
    ]
  }$chart$::jsonb)
where id = 'default';
