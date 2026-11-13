-- Align published organisation chart with the official organogram (9 departments, divisions, units).

update public.organization_settings
set chart = $chart${
  "boardCaption": "",
  "boardTitle": "Board",
  "executiveCaption": "",
  "executiveTitle": "Managing Director",
  "departments": [
    {
      "id": "secretary",
      "title": "Corporation Secretary & Legal Services Dept",
      "office": false,
      "divisions": [
        {
          "title": "Legal Services Div",
          "units": ["Board Secretariat Unit", "Compliance & Ethics Unit"]
        }
      ]
    },
    {
      "id": "production",
      "title": "Production Dept",
      "office": false,
      "divisions": [
        { "title": "Engineering Design & Work Preparation Div" },
        { "title": "New Build, Refit & Conversion Div" },
        { "title": "Civil & Modular Works Div" },
        { "title": "Yard Management Div" }
      ]
    },
    {
      "id": "mro",
      "title": "Maintenance, Repair & Overhaul Dept",
      "office": false,
      "divisions": [
        { "title": "Work Planning & Preparation Div" },
        { "title": "MRO Project Management Div" }
      ]
    },
    {
      "id": "commercial",
      "title": "Commercial Services Dept",
      "office": false,
      "divisions": [
        { "title": "Business Development Div" },
        { "title": "Marketing & Sales Div" }
      ]
    },
    {
      "id": "standards-qa",
      "title": "Standards & Quality Assurance Dept",
      "office": false,
      "divisions": [
        { "title": "Strategy, Planning & Performance Div" },
        { "title": "QMS & Risk Coordination Div" },
        { "title": "Inspection Div" },
        { "title": "Measurement Div" },
        { "title": "Commissioning Div" }
      ],
      "units": ["Non Destructive Testing Unit"]
    },
    {
      "id": "supply",
      "title": "Supply Chain Management Dept",
      "office": false,
      "divisions": [
        { "title": "Technical Procurement Div" },
        { "title": "Logistics & Transport Div" },
        { "title": "Warehousing Div" }
      ],
      "units": ["Administration Procurement Unit"]
    },
    {
      "id": "finance-it",
      "title": "Finance, Accounts & IT Dept",
      "office": false,
      "divisions": [
        { "title": "Financial Planning, Budgeting & Reporting Div" },
        { "title": "Accounting Div" },
        { "title": "Financial Controls Div" },
        { "title": "Information Technology Div" }
      ],
      "units": ["Project Financing Unit"]
    },
    {
      "id": "corporate-services",
      "title": "Corporate Services Dept",
      "office": false,
      "divisions": [
        { "title": "Administration & Security Div" },
        { "title": "Corporate Communication Div" },
        { "title": "Human Resources Div" },
        { "title": "Occupational Health, Safety & Environment Div" }
      ]
    },
    {
      "id": "audit",
      "title": "Internal Audit & Risk Assurance Dept",
      "office": false,
      "divisions": []
    }
  ]
}$chart$::jsonb
where id = 'default';
