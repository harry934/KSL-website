-- Replace the saved organisation chart with the proposed KSL organogram.

update public.organization_settings
set
  intro_body = case
    when intro_body = 'The Board provides governance oversight, while the Managing Director leads nine departments responsible for KSL’s shipbuilding, engineering, commercial, assurance, and corporate functions.'
    then 'The Board provides governance oversight. The Managing Director leads the shipbuilding, engineering, commercial, assurance, and corporate offices.'
    else intro_body
  end,
  chart = $chart${
    "boardCaption": "Governance",
    "boardTitle": "Board",
    "executiveCaption": "Executive leadership",
    "executiveTitle": "Managing Director",
    "departments": [
      {"id":"design","title":"Design & Production","office":false,"units":["Engineering Design & Dev Div","New Build, Refit & Conversion Div","Civil and Modular works Div"]},
      {"id":"mro","title":"Maintenance Repair & Overhaul","office":false,"units":["Maintenance Planning Div","MRO & Project Mgt Div","Precision Machining Div"]},
      {"id":"qa","title":"Quality Assurance & Standards","office":false,"units":["QA & Compliance Div","Research, Innovation & Advisory Div","Commissioning & Acceptance Div","Environment & Safety Div"]},
      {"id":"supply","title":"Supply Chain Management","office":false,"units":["Warehousing Div","Procurement Div"]},
      {"id":"commercial","title":"Commercial Services","office":false,"units":["Partnerships & Linkages Div","Business Development Div"]},
      {"id":"finance","title":"Finance and Accounts","office":false,"units":["Finance Div","Accounts Div","Project Financing Div"]},
      {"id":"hr","title":"Human Resource & Admin","office":false,"units":["Human Resource Mgt Div","Administration & Security Div","Corporate Communication Div","ICT Div"]},
      {"id":"special","title":"Special Projects","office":false,"units":[]},
      {"id":"secretary","title":"Company Secretary & Legal Services","office":false,"units":[]},
      {"id":"planning","title":"Corporate Planning","office":true,"units":[]},
      {"id":"audit-office","title":"Internal Audit & Risk Assurance","office":false,"units":[]}
    ]
  }$chart$::jsonb
where id = 'default';
