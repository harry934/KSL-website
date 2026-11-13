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

export type OrgDivision = {
  title: string;
  units: string[];
};

export type OrgDepartment = {
  id: string;
  title: string;
  divisions: OrgDivision[];
  units: string[];
  office: boolean;
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

export type BoardGroup = {
  id: string;
  label: string;
};

export const SHIPPED_BOARD_GROUPS: BoardGroup[] = [
  { id: "defence", label: "Defence" },
  { id: "ps", label: "Principal Secretaries" },
  { id: "independent", label: "Independent members" },
];

export const SHIPPED_BOARD_SECTIONS: BoardSection[] = [
  { id: "featured", name: "Leadership", title: "Leadership", blurb: "", showTitle: true, showBlurb: false },
  { id: "audit", name: "Audit", title: "Audit", blurb: "Finance, controls, and public accountability.", showTitle: true, showBlurb: true },
  { id: "risk", name: "Risk", title: "Risk", blurb: "Operational readiness and security.", showTitle: true, showBlurb: true },
  { id: "strategy", name: "Strategy", title: "Strategy", blurb: "Industrial growth and long term direction.", showTitle: true, showBlurb: true },
];

export type MilestonePrecision = "year" | "month" | "day";

export type MilestoneRow = {
  id: string;
  happened_on: string | null;
  date_precision: MilestonePrecision | null;
  title: string | null;
  summary: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_slot: string | null;
  story_key: string | null;
  tag_label: string | null;
  tag_note: string | null;
  sort_order: number;
  status: string;
};

export type MilestonesHeading = {
  title: string;
  lead: string;
};

export const SHIPPED_MILESTONES_HEADING: MilestonesHeading = {
  title: "Major Milestones",
  lead: "From the first yard works to MV Uhuru II entering the water.",
};

export const SHIPPED_INTRO: OrgIntro = {
  kicker: "",
  title: "Organisation structure",
  body: "",
};

const SHIPPED_DEPARTMENTS: OrgDepartment[] = [
  {
    id: "secretary",
    title: "Corporation Secretary & Legal Services Dept",
    office: false,
    divisions: [{ title: "Legal Services Div", units: ["Board Secretariat Unit", "Compliance & Ethics Unit"] }],
    units: [],
  },
  {
    id: "production",
    title: "Production Dept",
    office: false,
    divisions: [
      { title: "Engineering Design & Work Preparation Div", units: [] },
      { title: "New Build, Refit & Conversion Div", units: [] },
      { title: "Civil & Modular Works Div", units: [] },
      { title: "Yard Management Div", units: [] },
    ],
    units: [],
  },
  {
    id: "mro",
    title: "Maintenance, Repair & Overhaul Dept",
    office: false,
    divisions: [
      { title: "Work Planning & Preparation Div", units: [] },
      { title: "MRO Project Management Div", units: [] },
    ],
    units: [],
  },
  {
    id: "commercial",
    title: "Commercial Services Dept",
    office: false,
    divisions: [
      { title: "Business Development Div", units: [] },
      { title: "Marketing & Sales Div", units: [] },
    ],
    units: [],
  },
  {
    id: "standards-qa",
    title: "Standards & Quality Assurance Dept",
    office: false,
    divisions: [
      { title: "Strategy, Planning & Performance Div", units: [] },
      { title: "QMS & Risk Coordination Div", units: [] },
      { title: "Inspection Div", units: [] },
      { title: "Measurement Div", units: [] },
      { title: "Commissioning Div", units: [] },
    ],
    units: ["Non Destructive Testing Unit"],
  },
  {
    id: "supply",
    title: "Supply Chain Management Dept",
    office: false,
    divisions: [
      { title: "Technical Procurement Div", units: [] },
      { title: "Logistics & Transport Div", units: [] },
      { title: "Warehousing Div", units: [] },
    ],
    units: ["Administration Procurement Unit"],
  },
  {
    id: "finance-it",
    title: "Finance, Accounts & IT Dept",
    office: false,
    divisions: [
      { title: "Financial Planning, Budgeting & Reporting Div", units: [] },
      { title: "Accounting Div", units: [] },
      { title: "Financial Controls Div", units: [] },
      { title: "Information Technology Div", units: [] },
    ],
    units: ["Project Financing Unit"],
  },
  {
    id: "corporate-services",
    title: "Corporate Services Dept",
    office: false,
    divisions: [
      { title: "Administration & Security Div", units: [] },
      { title: "Corporate Communication Div", units: [] },
      { title: "Human Resources Div", units: [] },
      { title: "Occupational Health, Safety & Environment Div", units: [] },
    ],
    units: [],
  },
  {
    id: "audit",
    title: "Internal Audit & Risk Assurance Dept",
    office: false,
    divisions: [],
    units: [],
  },
];

export const SHIPPED_CHART: OrgChart = {
  boardCaption: "",
  boardTitle: "Board",
  executiveCaption: "",
  executiveTitle: "Managing Director",
  departments: SHIPPED_DEPARTMENTS,
};

function clip(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanIntro(value: unknown): OrgIntro {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    kicker: clip(record.intro_kicker ?? record.kicker, 80),
    title: clip(record.intro_title ?? record.title, 160) || SHIPPED_INTRO.title,
    body: clip(record.intro_body ?? record.body, 600),
  };
}

function cleanOrgDivision(value: unknown, index: number): OrgDivision | null {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const title = clip(row.title, 160);
  if (!title) return null;
  const units = Array.isArray(row.units) ? row.units : [];
  return {
    title,
    units: units.map((unit) => clip(unit, 160)).filter(Boolean).slice(0, 12),
  };
}

function legacyUnitsToDivisions(units: string[]): OrgDivision[] {
  return units.map((title) => ({ title, units: [] }));
}

export function cleanOrgChart(value: unknown): OrgChart {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const departments = Array.isArray(record.departments) ? record.departments : SHIPPED_CHART.departments;
  const seen = new Set<string>();
  return {
    boardCaption: clip(record.boardCaption, 80),
    boardTitle: clip(record.boardTitle, 120) || SHIPPED_CHART.boardTitle,
    executiveCaption: clip(record.executiveCaption, 80),
    executiveTitle: clip(record.executiveTitle, 120) || SHIPPED_CHART.executiveTitle,
    departments: departments
      .slice(0, 18)
      .map((item, index) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const flatUnits = Array.isArray(row.units) ? row.units.map((unit) => clip(unit, 160)).filter(Boolean).slice(0, 24) : [];
        const parsedDivisions = Array.isArray(row.divisions)
          ? row.divisions.map(cleanOrgDivision).filter((div): div is OrgDivision => Boolean(div)).slice(0, 16)
          : legacyUnitsToDivisions(flatUnits);
        const deptUnits = Array.isArray(row.divisions) && row.divisions.length ? flatUnits : [];
        let id = /^[a-zA-Z0-9_-]{1,80}$/.test(String(row.id ?? "")) ? String(row.id) : `dept-${index + 1}`;
        if (seen.has(id)) id = `dept-${index + 1}-${seen.size}`;
        seen.add(id);
        return {
          id,
          title: clip(row.title, 160),
          office: row.office === true,
          divisions: parsedDivisions,
          units: deptUnits,
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

export function cleanBoardGroups(value: unknown): BoardGroup[] {
  if (!Array.isArray(value) || value.length === 0) return SHIPPED_BOARD_GROUPS.map((group) => ({ ...group }));
  const seen = new Set<string>();
  const groups = value.slice(0, 12).map((item, index) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    let id = /^[a-z0-9_-]{1,40}$/.test(String(row.id ?? "")) ? String(row.id) : `group-${index + 1}`;
    if (seen.has(id)) id = `group-${index + 1}`;
    seen.add(id);
    return { id, label: clip(row.label ?? row.name, 80) || `Group ${index + 1}` };
  });
  return groups.length ? groups : SHIPPED_BOARD_GROUPS.map((group) => ({ ...group }));
}

export function cleanMilestonesHeading(value: unknown): MilestonesHeading {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    title: clip(record.milestones_title ?? record.title, 80) || SHIPPED_MILESTONES_HEADING.title,
    lead: clip(record.milestones_lead ?? record.lead, 240) || SHIPPED_MILESTONES_HEADING.lead,
  };
}

export function cleanMilestoneDate(value: unknown) {
  const text = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || year > 2100) return null;
  return text;
}

/** A milestone date can be a year, a year and month, or a full day. */
export function parseMilestoneWhen(value: unknown): { happened_on: string | null; date_precision: MilestonePrecision | null } {
  const text = String(value ?? "").trim();
  if (!text) return { happened_on: null, date_precision: null };
  const yearOnly = /^(\d{4})$/.exec(text);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    if (year < 1900 || year > 2100) return { happened_on: null, date_precision: null };
    return { happened_on: `${yearOnly[1]}-01-01`, date_precision: "year" };
  }
  const yearMonth = /^(\d{4})-(\d{2})$/.exec(text);
  if (yearMonth) {
    const year = Number(yearMonth[1]);
    const month = Number(yearMonth[2]);
    if (year < 1900 || year > 2100 || month < 1 || month > 12) return { happened_on: null, date_precision: null };
    return { happened_on: `${yearMonth[1]}-${yearMonth[2]}-01`, date_precision: "month" };
  }
  const full = cleanMilestoneDate(text);
  return full ? { happened_on: full, date_precision: "day" } : { happened_on: null, date_precision: null };
}

export function milestoneDateText(happenedOn: string | null | undefined, precision: MilestonePrecision | null | undefined) {
  const stored = cleanMilestoneDate(happenedOn);
  if (!stored) return "";
  if (precision === "year") return stored.slice(0, 4);
  if (precision === "month") return stored.slice(0, 7);
  return stored;
}

export function cleanStoryKey(value: unknown) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return text || null;
}

function httpsImage(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!/\.(jpe?g|png|webp)$/i.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function cleanMilestoneImage(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^img\/[a-z0-9_./-]+\.(jpe?g|png|webp)$/i.test(text)) return text;
  return httpsImage(text);
}

export function cleanImageSlot(value: unknown) {
  const text = String(value ?? "").trim();
  return /^about\.\d{1,3}-[a-z0-9-]{1,80}$/.test(text) ? text : null;
}

export function cleanMilestoneInput(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const image = cleanMilestoneImage(record.image_url);
  const when = parseMilestoneWhen(record.happened_on);
  return {
    happened_on: when.happened_on,
    date_precision: when.date_precision,
    title: clip(record.title, 120),
    summary: clip(record.summary, 400) || null,
    image_url: image,
    image_alt: clip(record.image_alt, 160) || null,
    image_slot: image?.startsWith("img/") ? cleanImageSlot(record.image_slot) : null,
    story_key: cleanStoryKey(record.story_key),
    tag_label: clip(record.tag_label, 80) || null,
    tag_note: clip(record.tag_note, 80) || null,
  };
}

export function toPublicOrganization(
  settings: {
    chart_download_id?: string | null;
    intro_kicker?: string | null;
    intro_title?: string | null;
    intro_body?: string | null;
    chart?: unknown;
    board_sections?: unknown;
    board_groups?: unknown;
    milestones_title?: string | null;
    milestones_lead?: string | null;
  } | null,
  leadership: LeadershipRow[],
  board: BoardMemberRow[],
  milestones: MilestoneRow[] = []
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
  const heading = cleanMilestonesHeading(settings ?? {});
  const chart = settings?.chart ? cleanOrgChart(settings.chart) : null;
  const boardSections = cleanBoardSections(settings?.board_sections);
  const boardGroups = cleanBoardGroups(settings?.board_groups);
  const pubMilestones = milestones
    .filter((row) => row.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((row) => {
      const rawDate = String(row.happened_on ?? "").trim();
      const when = parseMilestoneWhen(milestoneDateText(row.happened_on, row.date_precision) || (rawDate ? rawDate : ""));
      if (rawDate && !when.happened_on) return [];
      const title = clip(row.title, 120);
      const summary = clip(row.summary, 400);
      const image = cleanMilestoneImage(row.image_url);
      const date = milestoneDateText(when.happened_on, when.date_precision);
      if (!date && !title && !summary && !image) return [];
      return [{
        date,
        title,
        summary,
        image: image ?? "",
        alt: clip(row.image_alt, 160) || title,
        imageSlot: image?.startsWith("img/") ? cleanImageSlot(row.image_slot) ?? "" : "",
        story: "",
        tag: "",
        note: "",
      }];
    });
  const allowed = new Set(boardSections.map((section) => section.id));
  const allowedGroups = new Set(boardGroups.map((group) => group.id));
  const fallbackSection = boardSections[0]?.id ?? "featured";
  const fallbackGroup = boardGroups[0]?.id ?? "independent";
  return {
    chartDownloadId: settings?.chart_download_id ?? undefined,
    intro,
    chart: chart ?? undefined,
    leadership: pubLead,
    board: pubBoard.map((member) => ({
      ...member,
      section: allowed.has(member.section) ? member.section : fallbackSection,
      group: allowedGroups.has(member.group) ? member.group : fallbackGroup,
    })),
    boardSections: boardSections.map(({ id, title, blurb, showTitle, showBlurb }) => ({ id, title, blurb, showTitle, showBlurb })),
    boardGroups: boardGroups.map(({ id, label }) => ({ id, label })),
    milestonesTitle: heading.title,
    milestonesLead: heading.lead,
    milestones: pubMilestones,
  };
}
