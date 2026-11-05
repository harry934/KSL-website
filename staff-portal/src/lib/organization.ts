export type LeadershipRow = {
  id: string;
  role: string;
  summary: string | null;
  sort_order: number;
  status: string;
};

export type BoardMemberRow = {
  id: string;
  full_name: string;
  role: string;
  board_group: string;
  section: string;
  summary: string | null;
  bio: string | null;
  photo_url: string | null;
  sort_order: number;
  status: string;
};

export type OrgIntro = {
  kicker: string;
  title: string;
  body: string;
};

export type OrgDepartment = {
  id: string;
  title: string;
  units: string[];
};

export type OrgChart = {
  boardCaption: string;
  boardTitle: string;
  executiveCaption: string;
  executiveTitle: string;
  departments: OrgDepartment[];
};

export type BoardSection = {
  id: string;
  name: string;
  title: string;
  blurb: string;
  showTitle: boolean;
  showBlurb: boolean;
};

export const SHIPPED_BOARD_SECTIONS: BoardSection[] = [
  { id: "featured", name: "Leadership", title: "Leadership", blurb: "", showTitle: true, showBlurb: false },
  { id: "audit", name: "Audit", title: "Audit", blurb: "Finance, controls, and public accountability.", showTitle: true, showBlurb: true },
  { id: "risk", name: "Risk", title: "Risk", blurb: "Operational readiness and security.", showTitle: true, showBlurb: true },
  { id: "strategy", name: "Strategy", title: "Strategy", blurb: "Industrial growth and long term direction.", showTitle: true, showBlurb: true },
];

export const SHIPPED_INTRO: OrgIntro = {
  kicker: "Governance and operations",
  title: "How Kenya Shipyards Limited is structured",
  body: "The Board provides governance oversight, while the Managing Director leads nine departments responsible for KSL’s shipbuilding, engineering, commercial, assurance, and corporate functions.",
};

export const SHIPPED_CHART: OrgChart = {
  boardCaption: "Governance",
  boardTitle: "Board",
  executiveCaption: "Executive leadership",
  executiveTitle: "Managing Director",
  departments: [
    { id: "dept-01", title: "Corporation Secretary and Legal Services", units: ["Legal Services Division", "Board Secretarial Unit", "Compliance & Ethics Unit"] },
    { id: "dept-02", title: "Production", units: ["Engineering Design & Work Preparation Division", "New Build, Refit & Conversion Division", "Civil & Modular Works Division", "Yard Management Division"] },
    { id: "dept-03", title: "Maintenance, Repair & Overhaul", units: ["Work Planning & Preparation Division", "MRO Project Management Division"] },
    { id: "dept-04", title: "Commercial Services", units: ["Business Development Division", "Marketing & Sales Division"] },
    { id: "dept-05", title: "Strategy & Quality Assurance", units: ["Strategy Planning & Performance Division", "QMS & Risk Coordination Division", "Inspection Division", "Measurement Division", "Commissioning Division", "Non Destructive Testing Unit"] },
    { id: "dept-06", title: "Supply Chain Management", units: ["Technical Procurement Division", "Logistics & Transport Division", "Warehousing Division", "Administrative Procurement Unit"] },
    { id: "dept-07", title: "Finance, Accounts & Information Technology", units: ["Financial Planning, Budgeting & Reporting Division", "Accounting Division", "Financial Controls Division", "Information Technology Division", "Project Financing Unit"] },
    { id: "dept-08", title: "Corporate Services", units: ["Administration & Security Division", "Corporate Communications Division", "Human Resources Division", "Occupational Health, Safety & Environment Division"] },
    { id: "dept-09", title: "Internal Audit & Risk Assurance", units: [] },
  ],
};

function clip(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanIntro(value: unknown): OrgIntro {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    kicker: clip(record.intro_kicker ?? record.kicker, 80) || SHIPPED_INTRO.kicker,
    title: clip(record.intro_title ?? record.title, 160) || SHIPPED_INTRO.title,
    body: clip(record.intro_body ?? record.body, 600) || SHIPPED_INTRO.body,
  };
}

export function cleanOrgChart(value: unknown): OrgChart {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const departments = Array.isArray(record.departments) ? record.departments : SHIPPED_CHART.departments;
  const seen = new Set<string>();
  return {
    boardCaption: clip(record.boardCaption, 80) || SHIPPED_CHART.boardCaption,
    boardTitle: clip(record.boardTitle, 120) || SHIPPED_CHART.boardTitle,
    executiveCaption: clip(record.executiveCaption, 80) || SHIPPED_CHART.executiveCaption,
    executiveTitle: clip(record.executiveTitle, 120) || SHIPPED_CHART.executiveTitle,
    departments: departments
      .slice(0, 18)
      .map((item, index) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const units = Array.isArray(row.units) ? row.units : [];
        let id = /^[a-zA-Z0-9_-]{1,80}$/.test(String(row.id ?? "")) ? String(row.id) : `dept-${index + 1}`;
        if (seen.has(id)) id = `dept-${index + 1}-${seen.size}`;
        seen.add(id);
        return {
          id,
          title: clip(row.title, 160),
          units: units.map((unit) => clip(unit, 160)).filter(Boolean).slice(0, 24),
        };
      })
      .filter((dept) => dept.title),
  };
}

export function cleanBoardSections(value: unknown): BoardSection[] {
  if (!Array.isArray(value) || value.length === 0) return SHIPPED_BOARD_SECTIONS.map((section) => ({ ...section }));
  const seen = new Set<string>();
  const sections = value
    .slice(0, 12)
    .map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      let id = /^[a-zA-Z0-9_-]{1,40}$/.test(String(row.id ?? "")) ? String(row.id) : `section-${index + 1}`;
      if (seen.has(id)) id = `section-${index + 1}`;
      seen.add(id);
      const title = clip(row.title, 80);
      const name = clip(row.name, 80) || title || `Section ${index + 1}`;
      const showTitle = Boolean(title) && row.showTitle !== false && row.show_title !== false;
      const showBlurb = row.showBlurb !== false && row.show_blurb !== false;
      return {
        id,
        name,
        title,
        blurb: clip(row.blurb, 240),
        showTitle,
        showBlurb,
      };
    });
  return sections.length ? sections : SHIPPED_BOARD_SECTIONS.map((section) => ({ ...section }));
}

export function toPublicOrganization(
  settings: { chart_download_id?: string | null; intro_kicker?: string | null; intro_title?: string | null; intro_body?: string | null; chart?: unknown; board_sections?: unknown } | null,
  leadership: LeadershipRow[],
  board: BoardMemberRow[]
) {
  const pubLead = leadership
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({ role: r.role, summary: r.summary ?? "" }));

  const pubBoard = board
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      name: r.full_name,
      role: r.role,
      group: r.board_group,
      section: r.section || "audit",
      summary: r.summary ?? "",
      bio: r.bio ?? "",
      photo: r.photo_url ?? "",
    }));

  const intro = cleanIntro(settings ?? {});
  const chart = settings?.chart ? cleanOrgChart(settings.chart) : null;
  const boardSections = cleanBoardSections(settings?.board_sections);
  const allowed = new Set(boardSections.map((section) => section.id));
  const fallbackSection = boardSections[0]?.id ?? "featured";
  return {
    chartDownloadId: settings?.chart_download_id ?? undefined,
    intro,
    chart: chart ?? undefined,
    leadership: pubLead,
    board: pubBoard.map((member) => ({
      ...member,
      section: allowed.has(member.section) ? member.section : fallbackSection,
    })),
    boardSections: boardSections.map(({ id, title, blurb, showTitle, showBlurb }) => ({ id, title, blurb, showTitle, showBlurb })),
  };
}
