"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormSection, SaveBar, Select, Switch, Textarea, VisibilitySwitch } from "@/components/ui/form-bits";
import { ImageField } from "@/components/ui/image-field";
import { SearchSelect } from "@/components/ui/search-select";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { reorderItem } from "@/lib/list-utils";
import { sendJson } from "@/lib/upload-client";
import { documentOptions, useDocuments } from "@/lib/use-documents";
import { formatDay } from "@/lib/dates";
import { cleanBoardSections, cleanIntro, cleanOrgChart, SHIPPED_BOARD_SECTIONS, SHIPPED_CHART, SHIPPED_INTRO, SHIPPED_MILESTONES_HEADING, type BoardMemberRow, type BoardSection, type LeadershipRow, type MilestoneRow, type MilestonesHeading, type OrgChart, type OrgDepartment, type OrgIntro } from "@/lib/organization";
type Scope = "leadership" | "board" | "milestone";
type Draft = {
  scope: Scope;
  id?: string;
  role?: string;
  full_name?: string;
  board_group?: string;
  section?: string;
  photo_url?: string | null;
  happened_on?: string;
  title?: string;
  image_url?: string | null;
  image_alt?: string | null;
  image_slot?: string | null;
  story_key?: string | null;
  tag_label?: string | null;
  tag_note?: string | null;
  summary: string | null;
  bio?: string | null;
  sort_order: number;
  status: string;
};

const BOARD_GROUPS = [
  { value: "defence", label: "Defence" },
  { value: "ps", label: "Principal Secretaries" },
  { value: "independent", label: "Independent members" },
];

export function OrganizationEditor() {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("organization", "publish");
  const canDelete = useCan("organization", "delete");
  const documents = useDocuments();
  const [chartDownloadId, setChartDownloadId] = useState("");
  const [intro, setIntro] = useState<OrgIntro>(SHIPPED_INTRO);
  const [chart, setChart] = useState<OrgChart>(SHIPPED_CHART);
  const [openDept, setOpenDept] = useState<string | null>(null);
  const [leadership, setLeadership] = useState<LeadershipRow[]>([]);
  const [board, setBoard] = useState<BoardMemberRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [milestonesHeading, setMilestonesHeading] = useState<MilestonesHeading>(SHIPPED_MILESTONES_HEADING);
  const [boardSections, setBoardSections] = useState<BoardSection[]>(SHIPPED_BOARD_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/organization");
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setChartDownloadId(data.settings?.chart_download_id ?? "");
      setIntro(data.settings?.intro_title ? cleanIntro(data.settings) : SHIPPED_INTRO);
      setChart(data.settings?.chart ? cleanOrgChart(data.settings.chart) : SHIPPED_CHART);
      setBoardSections(Array.isArray(data.settings?.board_sections) ? cleanBoardSections(data.settings.board_sections) : SHIPPED_BOARD_SECTIONS);
      setLeadership(data.leadership ?? []);
      setBoard(data.board ?? []);
      setMilestones(data.milestones ?? []);
      setMilestonesHeading(data.settings?.milestones_title ? { title: data.settings.milestones_title, lead: data.settings.milestones_lead ?? "" } : SHIPPED_MILESTONES_HEADING);
    } else {
      toast(data.error ?? "Could not load the organisation page.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function settingsBody() {
    return {
      scope: "settings",
      chart_download_id: chartDownloadId || null,
      intro_kicker: intro.kicker,
      intro_title: intro.title,
      intro_body: intro.body,
      chart,
      board_sections: boardSections,
      milestones_title: milestonesHeading.title,
      milestones_lead: milestonesHeading.lead,
    };
  }

  async function saveSettings() {
    setSaving("settings");
    try {
      await sendJson("/api/organization", "POST", settingsBody());
      toast("Saved. The website updates within a few seconds.");
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  function patchDept(id: string, patch: Partial<OrgDepartment>) {
    setChart({
      ...chart,
      departments: chart.departments.map((dept) => (dept.id === id ? { ...dept, ...patch } : dept)),
    });
  }

  function moveDept(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= chart.departments.length) return;
    const departments = chart.departments.slice();
    const [row] = departments.splice(index, 1);
    departments.splice(next, 0, row);
    setChart({ ...chart, departments });
  }

  function moveUnit(deptId: string, index: number, direction: -1 | 1) {
    const dept = chart.departments.find((row) => row.id === deptId);
    if (!dept) return;
    const next = index + direction;
    if (next < 0 || next >= dept.units.length) return;
    const units = dept.units.slice();
    const [row] = units.splice(index, 1);
    units.splice(next, 0, row);
    patchDept(deptId, { units });
  }

  function start(scope: "leadership" | "board") {
    const list = scope === "board" ? board : leadership;
    setEditing({
      scope,
      role: "",
      full_name: "",
      board_group: "independent",
      section: boardSections[0]?.id ?? "featured",
      photo_url: "",
      summary: "",
      bio: "",
      sort_order: list.length ? Math.max(...list.map((r) => r.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startMilestone() {
    setEditing({
      scope: "milestone",
      happened_on: "",
      title: "",
      summary: "",
      image_url: "",
      image_alt: "",
      image_slot: "",
      story_key: "",
      tag_label: "",
      tag_note: "",
      sort_order: milestones.length ? Math.max(...milestones.map((row) => row.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveRow(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (editing.scope === "milestone") {
      if (!editing.happened_on || !editing.title?.trim() || !editing.summary?.trim() || !editing.image_url) {
        toast("Add the date, title, description, and photo.", "error");
        return;
      }
    } else if (editing.scope === "board") {
      if (!editing.full_name?.trim() || !editing.role?.trim()) {
        toast("Write the member's name and role.", "error");
        return;
      }
    } else if (!editing.role?.trim()) {
      toast("Write the role or office name.", "error");
      return;
    }
    setSaving("row");
    try {
      await sendJson("/api/organization", "POST", editing);
      toast("Saved.");
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  async function move(scope: Scope, from: number, to: number) {
    const list: (LeadershipRow | BoardMemberRow | MilestoneRow)[] = scope === "board" ? board : scope === "milestone" ? milestones : leadership;
    const next = reorderItem(list, from, to).map((row, i) => ({ ...row, sort_order: i }));
    const before = new Map(list.map((r) => [r.id, r.sort_order]));
    if (scope === "board") setBoard(next as BoardMemberRow[]);
    else if (scope === "milestone") setMilestones(next as MilestoneRow[]);
    else setLeadership(next as LeadershipRow[]);
    try {
      await Promise.all(
        next.filter((r) => before.get(r.id) !== r.sort_order).map((r) => sendJson("/api/organization", "POST", { ...r, scope }))
      );
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  async function moveBoard(section: string, from: number, to: number) {
    const order = boardSections.map((item) => item.id);
    const inSection = board.filter((row) => (row.section || "audit") === section);
    const reordered = reorderItem(inSection, from, to);
    const next = order
      .flatMap((key) => (key === section ? reordered : board.filter((row) => (row.section || "audit") === key)))
      .map((row, index) => ({ ...row, sort_order: index }));
    const before = new Map(board.map((row) => [row.id, row.sort_order]));
    setBoard(next);
    try {
      await Promise.all(
        next.filter((row) => before.get(row.id) !== row.sort_order).map((row) => sendJson("/api/organization", "POST", { ...row, scope: "board" }))
      );
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  function moveSection(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= boardSections.length) return;
    const sections = boardSections.slice();
    const [row] = sections.splice(index, 1);
    sections.splice(next, 0, row);
    setBoardSections(sections);
  }

  async function removeSection(id: string) {
    if (boardSections.length < 2) {
      toast("Keep at least one section.", "error");
      return;
    }
    const people = board.filter((row) => row.section === id);
    if (people.length) {
      const ok = await confirm({
        title: "Remove this section?",
        message: `${people.length} ${people.length === 1 ? "person moves" : "people move"} into the first section that remains.`,
        confirmLabel: "Remove",
        danger: true,
      });
      if (!ok) return;
    }
    const sections = boardSections.filter((section) => section.id !== id);
    const fallback = sections[0].id;
    setBoardSections(sections);
    setBoard(board.map((row) => (row.section === id ? { ...row, section: fallback } : row)));
  }

  async function remove(id: string, scope: Scope) {
    const ok = await confirm({
      title: "Delete this entry?",
      message: "It leaves the website and goes to the recycle bin.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/organization?id=${encodeURIComponent(id)}&scope=${scope}`, "DELETE");
      toast("Moved to the recycle bin.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the organisation page…
      </div>
    );
  }

  if (editing) {
    const set = (patch: Partial<Draft>) => setEditing({ ...editing, ...patch });
    const isBoard = editing.scope === "board";
    const isMilestone = editing.scope === "milestone";
    return (
      <form onSubmit={saveRow} className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <FormSection title={isMilestone ? (editing.id ? "Edit milestone" : "New milestone") : isBoard ? (editing.id ? "Edit board member" : "New board member") : editing.id ? "Edit leadership role" : "New leadership role"}>
            {isMilestone ? (
              <>
                <Field label="Date" hint="The year is shown large. The day and month sit beside it.">
                  <Input type="date" value={editing.happened_on ?? ""} onChange={(e) => set({ happened_on: e.target.value })} autoFocus={!editing.id} />
                </Field>
                <Field label="Title">
                  <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Mombasa yard begins" />
                </Field>
                <Field label="Description">
                  <Textarea className="min-h-[90px]" value={editing.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
                </Field>
                <Field label="Photo description" hint="Read aloud for people who cannot see the photo.">
                  <Input value={editing.image_alt ?? ""} onChange={(e) => set({ image_alt: e.target.value })} placeholder="e.g. Mombasa Shipyard aerial view" />
                </Field>
                <Field label="Link group" optional hint="Milestones that share this name highlight together. The two MV Uhuru II entries use uhuru.">
                  <Input value={editing.story_key ?? ""} onChange={(e) => set({ story_key: e.target.value })} placeholder="uhuru" />
                </Field>
                <Field label="Gold label" optional hint="A short line under the description, with a ship mark. Leave this blank to hide the label.">
                  <Input value={editing.tag_label ?? ""} onChange={(e) => set({ tag_label: e.target.value })} placeholder="MV Uhuru II, part 1 of 2" />
                </Field>
                <Field label="Label note" optional hint="A second line on that label, such as how long the work took.">
                  <Input value={editing.tag_note ?? ""} onChange={(e) => set({ tag_note: e.target.value })} placeholder="14 months from keel to water" />
                </Field>
              </>
            ) : isBoard ? (
              <>
                <Field label="Full name">
                  <Input value={editing.full_name ?? ""} onChange={(e) => set({ full_name: e.target.value })} autoFocus={!editing.id} />
                </Field>
                <Field label="Role">
                  <Input value={editing.role ?? ""} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Board member" />
                </Field>
                <Field label="Group">
                  <Select value={editing.board_group ?? "independent"} onChange={(e) => set({ board_group: e.target.value })}>
                    {BOARD_GROUPS.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Section" hint="The first section is shown as the large cards. The rest follow in this order.">
                  <Select value={editing.section ?? boardSections[0]?.id ?? "featured"} onChange={(e) => set({ section: e.target.value })}>
                    {boardSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name.trim() || section.title.trim() || "Section"}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <Field label="Role or office">
                <Input value={editing.role ?? ""} onChange={(e) => set({ role: e.target.value })} autoFocus={!editing.id} placeholder="e.g. Managing Director" />
              </Field>
            )}
            {!isMilestone && (
              <Field label="Short line" hint="The sentence on the card.">
                <Textarea className="min-h-[90px]" value={editing.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
              </Field>
            )}
            {isBoard && (
              <Field label="Full biography" hint="Leave a blank line between paragraphs. Start a line with - for a list.">
                <Textarea className="min-h-[180px]" value={editing.bio ?? ""} onChange={(e) => set({ bio: e.target.value })} />
              </Field>
            )}
          </FormSection>
          <div className="space-y-4">
            {isBoard && (
              <FormSection title="Photo" description="Optional. A portrait shown on the KSL Board page.">
                <ImageField module="organization" value={editing.photo_url ?? ""} onChange={(photo_url) => set({ photo_url })} />
              </FormSection>
            )}
            {isMilestone && (
              <FormSection title="Photo" description="The round photo on the milestone path.">
                <ImageField
                  module="organization"
                  value={editing.image_url ?? ""}
                  onChange={(image_url) => set({ image_url, image_slot: image_url.startsWith("img/") ? editing.image_slot : "" })}
                />
              </FormSection>
            )}
            <FormSection title="Visibility">
              <VisibilitySwitch status={editing.status} canPublish={canPublish} onChange={(status) => set({ status })} />
            </FormSection>
          </div>
        </div>
        <SaveBar>
          <Button variant="secondary" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving === "row"}>
            {saving === "row" ? "Saving…" : "Save"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  const groupLabel = (value: string) => BOARD_GROUPS.find((group) => group.value === value)?.label ?? value;
  const step = "text-[12px] font-bold uppercase tracking-wide text-[#0165FC]";

  return (
    <div className="space-y-5">
      <FormSection
        title="1. Introduction"
        description="The lines above the chart. Save this with the chart in step 3."
      >
        <Field label="Small heading">
          <Input value={intro.kicker} onChange={(e) => setIntro({ ...intro, kicker: e.target.value })} />
        </Field>
        <Field label="Main heading">
          <Input value={intro.title} onChange={(e) => setIntro({ ...intro, title: e.target.value })} />
        </Field>
        <Field label="Paragraph">
          <Textarea value={intro.body} onChange={(e) => setIntro({ ...intro, body: e.target.value })} />
        </Field>
      </FormSection>

      <FormSection
        title="2. Top of the chart"
        description="Visitors see the Board first, then the Managing Director."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Board label" hint="The small line on the navy box.">
            <Input value={chart.boardCaption} onChange={(e) => setChart({ ...chart, boardCaption: e.target.value })} />
          </Field>
          <Field label="Board name">
            <Input value={chart.boardTitle} onChange={(e) => setChart({ ...chart, boardTitle: e.target.value })} />
          </Field>
          <Field label="Managing Director label" hint="The small line on the blue box.">
            <Input value={chart.executiveCaption} onChange={(e) => setChart({ ...chart, executiveCaption: e.target.value })} />
          </Field>
          <Field label="Managing Director name">
            <Input value={chart.executiveTitle} onChange={(e) => setChart({ ...chart, executiveTitle: e.target.value })} />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="3. Departments"
        description="Change them in this order. Department 01 is first on the page, then 02, left to right. Open a department to edit the units under it, top to bottom."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              const id = `dept-${Date.now().toString(36)}`;
              setChart({ ...chart, departments: [...chart.departments, { id, title: "New department", units: [] }] });
              setOpenDept(id);
            }}
          >
            <Plus className="h-4 w-4" /> Add department
          </Button>
        }
      >
        <div className="space-y-3">
          {chart.departments.map((dept, index) => {
            const open = openDept === dept.id;
            const number = String(index + 1).padStart(2, "0");
            return (
              <div key={dept.id} className="rounded-md border border-[#e4eaf2]">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="w-8 text-[12px] font-bold text-[#99792c]">{number}</span>
                  <Input
                    className="min-w-[220px] flex-1"
                    value={dept.title}
                    onChange={(e) => patchDept(dept.id, { title: e.target.value })}
                    aria-label={`Department ${number} name`}
                  />
                  <Button variant="secondary" onClick={() => moveDept(index, -1)} disabled={index === 0} aria-label="Move department up">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" onClick={() => moveDept(index, 1)} disabled={index === chart.departments.length - 1} aria-label="Move department down">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" onClick={() => setOpenDept(open ? null : dept.id)}>
                    {open ? "Hide units" : `Units (${dept.units.length})`}
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label="Remove department"
                    onClick={() => {
                      setChart({ ...chart, departments: chart.departments.filter((row) => row.id !== dept.id) });
                      if (open) setOpenDept(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {open && (
                  <div className="space-y-2 border-t border-[#eef1f4] px-3 py-3">
                    {dept.units.map((unit, unitIndex) => (
                      <div key={`${dept.id}-${unitIndex}`} className="flex items-center gap-2">
                        <span className="w-6 text-[12px] text-[#6b7785]">{unitIndex + 1}</span>
                        <Input
                          value={unit}
                          onChange={(e) => {
                            const units = dept.units.slice();
                            units[unitIndex] = e.target.value;
                            patchDept(dept.id, { units });
                          }}
                          aria-label={`Unit ${unitIndex + 1}`}
                        />
                        <Button variant="secondary" onClick={() => moveUnit(dept.id, unitIndex, -1)} disabled={unitIndex === 0} aria-label="Move unit up">
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" onClick={() => moveUnit(dept.id, unitIndex, 1)} disabled={unitIndex === dept.units.length - 1} aria-label="Move unit down">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          aria-label="Remove unit"
                          onClick={() => patchDept(dept.id, { units: dept.units.filter((_, i) => i !== unitIndex) })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="secondary" onClick={() => patchDept(dept.id, { units: [...dept.units, ""] })}>
                      <Plus className="h-4 w-4" /> Add unit
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save introduction and chart"}
        </Button>
      </FormSection>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={step}>Step 4</p>
            <h2 className="text-[15px] font-bold text-[#0b1f3a]">Cards under the chart</h2>
            <p className="text-[13px] text-[#6b7785]">These sit below the departments. The top card is shown first. Set Visibility to Published or the card stays off the website.</p>
          </div>
          <Button onClick={() => start("leadership")}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        </div>
        <ItemList
          items={leadership.map((r) => ({ id: r.id, title: r.role, subtitle: r.summary, status: r.status }))}
          onEdit={(id) => {
            const row = leadership.find((r) => r.id === id);
            if (row) setEditing({ ...row, scope: "leadership" });
          }}
          onDelete={canDelete ? (id) => remove(id, "leadership") : undefined}
          onReorder={(from, to) => move("leadership", from, to)}
          emptyText="No leadership cards yet."
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={step}>Step 5</p>
            <h2 className="text-[15px] font-bold text-[#0b1f3a]">KSL Board page</h2>
            <p className="text-[13px] text-[#6b7785]">Each section keeps its name here. The website title is optional, so you can create a section with no title or clear a title and the section still stays. Press Save board sections, then refresh the KSL Board page.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setBoardSections([
                  ...boardSections,
                  { id: `section-${Date.now().toString(36)}`, name: `Section ${boardSections.length + 1}`, title: "", blurb: "", showTitle: false, showBlurb: false },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Add section
            </Button>
            <Button variant="secondary" onClick={() => start("board")}>
              <Plus className="h-4 w-4" /> New board member
            </Button>
          </div>
        </div>
        {boardSections.map((section, index) => {
          const people = board.filter((row) => (row.section || boardSections[0]?.id) === section.id);
          return (
            <div key={section.id} className="space-y-3 rounded-md border border-[#e4eaf2] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-[12px] font-bold text-[#99792c]">{index + 1}</span>
                <label className="min-w-[180px] flex-1 text-[12px] font-semibold text-[#6b7785]">
                  Section name
                  <Input
                    className="mt-1 font-normal"
                    value={section.name}
                    onChange={(e) => setBoardSections(boardSections.map((row) => (row.id === section.id ? { ...row, name: e.target.value } : row)))}
                    placeholder="Section name"
                    aria-label={`Section ${index + 1} name`}
                  />
                </label>
                <Button variant="secondary" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label="Move section up">
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={() => moveSection(index, 1)} disabled={index === boardSections.length - 1} aria-label="Move section down">
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={() => removeSection(section.id)} aria-label="Remove section">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <label className="block text-[12px] font-semibold text-[#6b7785]">
                Website title
                <Input
                  className="mt-1 font-normal"
                  value={section.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setBoardSections(
                      boardSections.map((row) =>
                        row.id === section.id
                          ? { ...row, title, showTitle: title.trim() ? (row.title.trim() ? row.showTitle : true) : false }
                          : row
                      )
                    );
                  }}
                  placeholder="No title on the website"
                  aria-label={`Section ${index + 1} website title`}
                />
              </label>
              <Input
                value={section.blurb}
                onChange={(e) => setBoardSections(boardSections.map((row) => (row.id === section.id ? { ...row, blurb: e.target.value } : row)))}
                placeholder="No explanation"
                aria-label={`Section ${index + 1} explanation`}
              />
              <div className="flex flex-wrap gap-6">
                <Switch
                  checked={section.showTitle !== false && Boolean(section.title.trim())}
                  onChange={(showTitle) => setBoardSections(boardSections.map((row) => (row.id === section.id ? { ...row, showTitle } : row)))}
                  label="Show title"
                  disabled={!section.title.trim()}
                />
                <Switch
                  checked={section.showBlurb !== false && Boolean(section.blurb.trim())}
                  onChange={(showBlurb) => setBoardSections(boardSections.map((row) => (row.id === section.id ? { ...row, showBlurb } : row)))}
                  label="Show explanation"
                  disabled={!section.blurb.trim()}
                />
              </div>
              <ItemList
                showImages
                items={people.map((r) => ({
                  id: r.id,
                  title: r.full_name,
                  subtitle: [r.role, groupLabel(r.board_group)].filter(Boolean).join(" · "),
                  image: r.photo_url,
                  status: r.status,
                }))}
                onEdit={(id) => {
                  const row = board.find((r) => r.id === id);
                  if (row) setEditing({ ...row, scope: "board" });
                }}
                onDelete={canDelete ? (id) => remove(id, "board") : undefined}
                onReorder={(from, to) => moveBoard(section.id, from, to)}
                emptyText={`No one in ${section.name.trim() || "this section"} yet.`}
              />
            </div>
          );
        })}
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save board sections"}
        </Button>
      </div>

      <FormSection title="6. Chart download" description="The document button under the leadership cards.">
        <Field label="Document">
          <SearchSelect
            value={chartDownloadId}
            options={documentOptions(documents, chartDownloadId)}
            onChange={setChartDownloadId}
            emptyLabel="No document"
            searchPlaceholder="Search documents"
          />
        </Field>
        <Button onClick={saveSettings} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save download"}
        </Button>
      </FormSection>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={step}>Step 7</p>
            <h2 className="text-[15px] font-bold text-[#0b1f3a]">Major milestones</h2>
            <p className="text-[13px] text-[#6b7785]">The path on Who We Are. The top milestone is shown first. Drag a row to change the order. Set Visibility to Published or it stays off the website.</p>
          </div>
          <Button onClick={startMilestone}>
            <Plus className="h-4 w-4" /> New milestone
          </Button>
        </div>
        <FormSection title="Heading" description="The title and the line under it.">
          <Field label="Title">
            <Input value={milestonesHeading.title} onChange={(e) => setMilestonesHeading({ ...milestonesHeading, title: e.target.value })} />
          </Field>
          <Field label="Introduction">
            <Textarea value={milestonesHeading.lead} onChange={(e) => setMilestonesHeading({ ...milestonesHeading, lead: e.target.value })} />
          </Field>
          <Button onClick={saveSettings} disabled={saving === "settings"}>
            {saving === "settings" ? "Saving…" : "Save heading"}
          </Button>
        </FormSection>
        <ItemList
          showImages
          dragFrom={2}
          items={milestones.map((row) => ({
            id: row.id,
            title: row.title,
            subtitle: [formatDay(String(row.happened_on).slice(0, 10)), row.tag_label].filter(Boolean).join(" · "),
            image: row.image_url,
            status: row.status,
          }))}
          onEdit={(id) => {
            const row = milestones.find((item) => item.id === id);
            if (row) setEditing({ ...row, scope: "milestone", happened_on: String(row.happened_on).slice(0, 10) });
          }}
          onDelete={canDelete ? (id) => remove(id, "milestone") : undefined}
          onReorder={(from, to) => move("milestone", from, to)}
          emptyText="No milestones yet."
        />
      </div>
    </div>
  );
}
