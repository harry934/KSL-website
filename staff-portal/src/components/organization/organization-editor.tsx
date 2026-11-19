"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormSection, SaveBar, Select, Textarea, VisibilitySwitch } from "@/components/ui/form-bits";
import { ImageField } from "@/components/ui/image-field";
import { SearchSelect } from "@/components/ui/search-select";
import { ItemList } from "@/components/ui/item-list";
import { useFeedback } from "@/components/ui/feedback";
import { useCan } from "@/components/portal/session-context";
import { keyFrom, reorderItem } from "@/lib/list-utils";
import { sendJson, awaitingReview, DRAFT_SAVED } from "@/lib/upload-client";
import { documentOptions, useDocuments } from "@/lib/use-documents";
import { cleanBoardGroups, cleanBoardSections, cleanIntro, cleanOrgChart, milestoneDateText, parseMilestoneWhen, SHIPPED_BOARD_GROUPS, SHIPPED_BOARD_SECTIONS, SHIPPED_CHART, SHIPPED_INTRO, SHIPPED_MILESTONES_HEADING, type BoardGroup, type BoardMemberRow, type BoardSection, type LeadershipRow, type MilestoneRow, type MilestonesHeading, type OrgChart, type OrgIntro } from "@/lib/organization";
import { appPath } from "@/lib/base-path";
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
  year?: string;
  month?: string;
  day?: string;
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

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function milestoneWhenLabel(row: MilestoneRow) {
  const text = milestoneDateText(row.happened_on, row.date_precision || (row.happened_on ? "day" : null));
  if (/^\d{4}-\d{2}$/.test(text)) return `${MONTHS[Number(text.slice(5, 7)) - 1]} ${text.slice(0, 4)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const day = Number(text.slice(8, 10));
    return `${day} ${MONTHS[Number(text.slice(5, 7)) - 1]} ${text.slice(0, 4)}`;
  }
  return text;
}

export function OrganizationEditor({ view = "organisation" }: { view?: "organisation" | "board" }) {
  const { toast, confirm } = useFeedback();
  const canPublish = useCan("organization", "publish");
  const canDelete = useCan("organization", "delete");
  const documents = useDocuments();
  const [chartDownloadId, setChartDownloadId] = useState("");
  const [intro, setIntro] = useState<OrgIntro>(SHIPPED_INTRO);
  const [chart, setChart] = useState<OrgChart>(SHIPPED_CHART);
  const [leadership, setLeadership] = useState<LeadershipRow[]>([]);
  const [board, setBoard] = useState<BoardMemberRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [milestonesHeading, setMilestonesHeading] = useState<MilestonesHeading>(SHIPPED_MILESTONES_HEADING);
  const [boardSections, setBoardSections] = useState<BoardSection[]>(SHIPPED_BOARD_SECTIONS);
  const [boardGroups, setBoardGroups] = useState<BoardGroup[]>(SHIPPED_BOARD_GROUPS);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const returnTo = useRef<string | null>(null);
  const savedGroupIds = useRef<string[]>(SHIPPED_BOARD_GROUPS.map((group) => group.id));

  function showSection(id: string | null) {
    if (!id) return;
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function anchorFor(draft: Draft) {
    if (draft.scope === "milestone") return "org-milestones";
    if (draft.scope === "leadership") return "org-leadership";
    return `board-section-${draft.section || boardSections[0]?.id || "featured"}`;
  }

  function openDraft(draft: Draft, anchor: string) {
    returnTo.current = anchor;
    setEditing(draft);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const load = useCallback(async () => {
    const res = await fetch(appPath("/api/organization"));
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setChartDownloadId(data.settings?.chart_download_id ?? "");
      setIntro(data.settings?.intro_title ? cleanIntro(data.settings) : SHIPPED_INTRO);
      setChart(data.settings?.chart ? cleanOrgChart(data.settings.chart) : SHIPPED_CHART);
      setBoardSections(Array.isArray(data.settings?.board_sections) ? cleanBoardSections(data.settings.board_sections) : SHIPPED_BOARD_SECTIONS);
      const groups = Array.isArray(data.settings?.board_groups) ? cleanBoardGroups(data.settings.board_groups) : SHIPPED_BOARD_GROUPS;
      setBoardGroups(groups);
      savedGroupIds.current = groups.map((group) => group.id);
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

  const openedEdit = useRef(false);
  useEffect(() => {
    if (loading || openedEdit.current) return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("edit");
    if (!id) {
      openedEdit.current = true;
      return;
    }
    const leader = leadership.find((row) => row.id === id);
    const member = board.find((row) => row.id === id);
    const milestone = milestones.find((row) => row.id === id);
    if (!leader && !member && !milestone) return;
    openedEdit.current = true;
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    if (leader) openDraft({ ...leader, scope: "leadership" }, "org-leadership");
    else if (member) openDraft({ ...member, scope: "board" }, `board-section-${member.section || boardSections[0]?.id || "featured"}`);
    else if (milestone) {
      const shown = milestoneDateText(milestone.happened_on, milestone.date_precision || (milestone.happened_on ? "day" : null));
      const [year, month, day] = shown.split("-");
      openDraft(
        {
          ...milestone,
          scope: "milestone",
          happened_on: milestone.happened_on ?? "",
          title: milestone.title ?? "",
          year: year || "",
          month: month || "",
          day: day || "",
        },
        "org-milestones"
      );
    }
  }, [loading, leadership, board, milestones, boardSections]);

  function settingsBody() {
    return {
      scope: "settings",
      chart_download_id: chartDownloadId || null,
      intro_kicker: intro.kicker,
      intro_title: intro.title,
      intro_body: intro.body,
      chart,
      board_sections: boardSections,
      board_groups: boardGroups,
      milestones_title: milestonesHeading.title,
      milestones_lead: milestonesHeading.lead,
    };
  }

  async function saveSettings(anchor: string) {
    setSaving("settings");
    try {
      const saved = await sendJson("/api/organization", "POST", settingsBody());
      toast(awaitingReview(saved) ? DRAFT_SAVED : "Saved. The website updates within a few seconds.");
      await load();
      showSection(anchor);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(null);
    }
  }

  function start(scope: "leadership" | "board") {
    const list = scope === "board" ? board : leadership;
    const section = boardSections[0]?.id ?? "featured";
    openDraft({
      scope,
      role: "",
      full_name: "",
      board_group: boardGroups[0]?.id ?? "independent",
      section,
      photo_url: "",
      summary: "",
      bio: "",
      sort_order: list.length ? Math.max(...list.map((r) => r.sort_order)) + 1 : 0,
      status: canPublish ? "published" : "draft",
    }, scope === "board" ? `board-section-${section}` : "org-leadership");
  }

  function startMilestone() {
    openDraft({
      scope: "milestone",
      happened_on: "",
      year: "",
      month: "",
      day: "",
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
    }, "org-milestones");
  }

  async function saveRow(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    let payload = editing;
    if (editing.scope === "milestone") {
      const year = (editing.year ?? "").trim();
      const month = editing.month ?? "";
      const day = editing.day ?? "";
      if (year && !/^\d{4}$/.test(year)) {
        toast("Use a four-digit year, or leave the year blank.", "error");
        return;
      }
      const happened = !year ? "" : !month ? year : !day ? `${year}-${month}` : `${year}-${month}-${day}`;
      if (happened && !parseMilestoneWhen(happened).happened_on) {
        toast("That day is not in that month.", "error");
        return;
      }
      payload = { ...editing, happened_on: happened, title: editing.title ?? "", summary: editing.summary ?? "", story_key: null, tag_label: null, tag_note: null };
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
      const saved = await sendJson("/api/organization", "POST", payload);
      toast(awaitingReview(saved) ? DRAFT_SAVED : "Saved.");
      const anchor = anchorFor(payload);
      setEditing(null);
      await load();
      showSection(anchor);
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

  function memberSection(row: BoardMemberRow) {
    return row.section || boardSections[0]?.id || "featured";
  }

  async function moveBoard(section: string, from: number, to: number) {
    const order = boardSections.map((item) => item.id);
    const inSection = board.filter((row) => memberSection(row) === section);
    const reordered = reorderItem(inSection, from, to);
    const next = order
      .flatMap((key) => (key === section ? reordered : board.filter((row) => memberSection(row) === key)))
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

  async function changeGroup(id: string, groupId: string) {
    const row = board.find((member) => member.id === id);
    if (!row || row.board_group === groupId) return;
    setBoard(board.map((member) => (member.id === id ? { ...member, board_group: groupId } : member)));
    try {
      if (!savedGroupIds.current.includes(groupId)) {
        const savedGroups = await sendJson("/api/organization", "POST", { ...settingsBody(), board_groups: boardGroups });
        if (!awaitingReview(savedGroups)) savedGroupIds.current = boardGroups.map((group) => group.id);
      }
      const saved = await sendJson("/api/organization", "POST", { ...row, board_group: groupId, scope: "board" });
      if (awaitingReview(saved)) toast(DRAFT_SAVED);
    } catch (err) {
      toast((err as Error).message, "error");
      load();
    }
  }

  function moveGroup(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= boardGroups.length) return;
    const groups = boardGroups.slice();
    const [group] = groups.splice(index, 1);
    groups.splice(next, 0, group);
    setBoardGroups(groups);
  }

  async function removeGroup(id: string) {
    if (boardGroups.length < 2) {
      toast("Keep at least one group.", "error");
      return;
    }
    const people = board.filter((member) => member.board_group === id);
    if (people.length) {
      const ok = await confirm({
        title: "Remove this group?",
        message: `${people.length} ${people.length === 1 ? "person moves" : "people move"} into the first group that remains.`,
        confirmLabel: "Remove",
        danger: true,
      });
      if (!ok) return;
    }
    const groups = boardGroups.filter((group) => group.id !== id);
    const fallback = groups[0].id;
    setBoardGroups(groups);
    setBoard(board.map((member) => (member.board_group === id ? { ...member, board_group: fallback } : member)));
    try {
      const saved = await sendJson("/api/organization", "POST", { ...settingsBody(), board_groups: groups });
      await Promise.all(people.map((member) => sendJson("/api/organization", "POST", { ...member, board_group: fallback, scope: "board" })));
      if (!awaitingReview(saved)) savedGroupIds.current = groups.map((group) => group.id);
      toast(awaitingReview(saved) ? DRAFT_SAVED : "Group removed.");
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
      message: "It leaves the website and is permanently deleted from the website.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/organization?id=${encodeURIComponent(id)}&scope=${scope}`, "DELETE");
      toast("Deleted.");
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> {view === "board" ? "Loading the board…" : "Loading the organisation page…"}
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
                <Field label="Year" optional hint="A year is enough. Add a month or a day only when you want them shown.">
                  <Input value={editing.year ?? ""} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" placeholder="2018" autoFocus={!editing.id} />
                </Field>
                <Field label="Month" optional>
                  <Select value={editing.month ?? ""} onChange={(e) => set({ month: e.target.value, day: e.target.value ? editing.day : "" })}>
                    <option value="">No month</option>
                    {MONTHS.map((name, index) => (
                      <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Day" optional>
                  <Select value={editing.day ?? ""} onChange={(e) => set({ day: e.target.value })} disabled={!editing.month}>
                    <option value="">No day</option>
                    {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")).map((value) => (
                      <option key={value} value={value}>{Number(value)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Title" optional>
                  <Input value={editing.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Mombasa yard begins" />
                </Field>
                <Field label="Description" optional>
                  <Textarea className="min-h-[90px]" value={editing.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} />
                </Field>
                <Field label="Photo description" optional hint="Read aloud for people who cannot see the photo.">
                  <Input value={editing.image_alt ?? ""} onChange={(e) => set({ image_alt: e.target.value })} placeholder="e.g. Mombasa Shipyard aerial view" />
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
                  <Select value={editing.board_group ?? boardGroups[0]?.id ?? "independent"} onChange={(e) => set({ board_group: e.target.value })}>
                    {(boardGroups.some((group) => group.id === editing.board_group) ? boardGroups : [...boardGroups, { id: editing.board_group || "independent", label: editing.board_group || "Group" }]).map((group) => (
                      <option key={group.id} value={group.id}>
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
              <FormSection title="Photo" description="Optional. The round photo on the milestone path.">
                <ImageField
                  module="organization"
                  fromGallery
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
          <Button variant="secondary" onClick={() => { const anchor = returnTo.current; setEditing(null); showSection(anchor); }}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving === "row"}>
            {saving === "row" ? "Saving…" : "Save"}
          </Button>
        </SaveBar>
      </form>
    );
  }

  const groupLabel = (value: string) => boardGroups.find((group) => group.id === value)?.label ?? value;
  const orgNav = [
    { id: "org-intro", label: "Introduction" },
    { id: "org-leadership", label: "Leadership" },
    { id: "org-download", label: "Download" },
    { id: "org-milestones", label: "Milestones" },
  ];

  return (
    <div className="space-y-5">
      {view === "organisation" && (
      <>
      <nav aria-label="Organisation sections" className="sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto bg-[#f4f6f8]/95 px-1 py-2 backdrop-blur">
        {orgNav.map((item) => (
          <a key={item.id} href={`#${item.id}`} className="shrink-0 rounded-full border border-[#d7e0ec] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#0b1f3a] hover:border-[#0165FC] hover:text-[#0165FC]">
            {item.label}
          </a>
        ))}
      </nav>

      <div id="org-intro" className="scroll-mt-24">
      <FormSection title="Introduction" description="Shown above the View organisation structure button on the website.">
        <Field label="Small heading">
          <Input value={intro.kicker} onChange={(e) => setIntro({ ...intro, kicker: e.target.value })} />
        </Field>
        <Field label="Main heading">
          <Input value={intro.title} onChange={(e) => setIntro({ ...intro, title: e.target.value })} />
        </Field>
        <Field label="Paragraph">
          <Textarea value={intro.body} onChange={(e) => setIntro({ ...intro, body: e.target.value })} />
        </Field>
        <Button onClick={() => saveSettings("org-intro")} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save introduction"}
        </Button>
      </FormSection>
      </div>

      <div id="org-leadership" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#0b1f3a]">Leadership cards</h2>
            <p className="text-[13px] text-[#6b7785]">Shown on the Organisation page under the structure button. The top card is shown first. Set Visibility to Published or the card stays off the website.</p>
          </div>
          <Button onClick={() => start("leadership")}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        </div>
        <ItemList
          items={leadership.map((r) => ({ id: r.id, title: r.role, subtitle: r.summary, status: r.status }))}
          onEdit={(id) => {
            const row = leadership.find((r) => r.id === id);
            if (row) openDraft({ ...row, scope: "leadership" }, "org-leadership");
          }}
          onDelete={canDelete ? (id) => remove(id, "leadership") : undefined}
          onReorder={(from, to) => move("leadership", from, to)}
          emptyText="No leadership cards yet."
        />
      </div>
      </>
      )}

      {view === "board" && (
      <div id="board-sections" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#0b1f3a]">Board members</h2>
            <p className="text-[13px] text-[#6b7785]">Drag a member up or down inside their section. The top person is shown first. Use the group menu to move someone between groups.</p>
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
        <div id="board-groups" className="space-y-3 rounded-md border border-[#e4eaf2] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-bold text-[#0b1f3a]">Groups</h3>
              <p className="text-[13px] text-[#6b7785]">These are the filters on the KSL Board page. Add a group, rename it, or remove it. Save the board after you change a name.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const id = keyFrom(`Group ${boardGroups.length + 1}`, boardGroups.map((group) => group.id));
                setBoardGroups([...boardGroups, { id, label: `Group ${boardGroups.length + 1}` }]);
              }}
            >
              <Plus className="h-4 w-4" /> Add group
            </Button>
          </div>
          {boardGroups.map((group, index) => (
            <div key={group.id} className="flex flex-wrap items-center gap-2">
              <span className="w-6 text-[12px] font-bold text-[#99792c]">{index + 1}</span>
              <label className="min-w-[180px] flex-1 text-[12px] font-semibold text-[#6b7785]">
                Group name
                <Input
                  className="mt-1 font-normal"
                  value={group.label}
                  onChange={(e) => setBoardGroups(boardGroups.map((row) => (row.id === group.id ? { ...row, label: e.target.value } : row)))}
                  aria-label={`Group ${index + 1} name`}
                />
              </label>
              <Button variant="secondary" onClick={() => moveGroup(index, -1)} disabled={index === 0} aria-label="Move group up">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => moveGroup(index, 1)} disabled={index === boardGroups.length - 1} aria-label="Move group down">
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => removeGroup(group.id)} aria-label="Remove group">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {boardSections.map((section, index) => {
          const people = board.filter((row) => memberSection(row) === section.id);
          return (
            <div key={section.id} id={`board-section-${section.id}`} className="scroll-mt-24 space-y-3 rounded-md border border-[#e4eaf2] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-[12px] font-bold text-[#99792c]">{index + 1}</span>
                <label className="min-w-[180px] flex-1 text-[12px] font-semibold text-[#6b7785]">
                  Section name
                  <Input
                    className="mt-1 font-normal"
                    value={section.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setBoardSections(boardSections.map((row) => (row.id === section.id ? { ...row, name, title: name, showTitle: Boolean(name.trim()) } : row)));
                    }}
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
              <ItemList
                showImages
                dragFrom={2}
                items={people.map((r) => ({
                  id: r.id,
                  title: r.full_name,
                  subtitle: [r.role, groupLabel(r.board_group)].filter(Boolean).join(" · "),
                  image: r.photo_url,
                  status: r.status,
                }))}
                onEdit={(id) => {
                  const row = board.find((r) => r.id === id);
                  if (row) openDraft({ ...row, scope: "board" }, `board-section-${memberSection(row)}`);
                }}
                onDelete={canDelete ? (id) => remove(id, "board") : undefined}
                onReorder={(from, to) => moveBoard(section.id, from, to)}
                extra={(item) => {
                  const current = board.find((row) => row.id === item.id)?.board_group ?? boardGroups[0]?.id ?? "";
                  const options = boardGroups.some((group) => group.id === current) ? boardGroups : [...boardGroups, { id: current, label: current || "Group" }];
                  return (
                    <select
                      className="h-8 max-w-[190px] rounded-md border border-[#d7e0ec] bg-white px-2 text-[12.5px] font-normal text-[#0b1f3a]"
                      value={current}
                      onChange={(event) => changeGroup(item.id, event.target.value)}
                      aria-label={`Group for ${item.title}`}
                    >
                      {options.map((group) => (
                        <option key={group.id} value={group.id}>{group.label}</option>
                      ))}
                    </select>
                  );
                }}
                emptyText={`No one in ${section.name.trim() || "this section"} yet.`}
              />
            </div>
          );
        })}
        <Button onClick={() => saveSettings("board-sections")} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save board"}
        </Button>
      </div>
      )}

      {view === "organisation" && (
      <>
      <div id="org-download" className="scroll-mt-24">
      <FormSection title="Chart download" description="The Strategic Plan button under the leadership cards.">
        <Field label="Document">
          <SearchSelect
            value={chartDownloadId}
            options={documentOptions(documents, chartDownloadId)}
            onChange={setChartDownloadId}
            emptyLabel="No document"
            searchPlaceholder="Search documents"
          />
        </Field>
        <Button onClick={() => saveSettings("org-download")} disabled={saving === "settings"}>
          {saving === "settings" ? "Saving…" : "Save download"}
        </Button>
      </FormSection>
      </div>

      <div id="org-milestones" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
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
          <Button onClick={() => saveSettings("org-milestones")} disabled={saving === "settings"}>
            {saving === "settings" ? "Saving…" : "Save heading"}
          </Button>
        </FormSection>
        <ItemList
          showImages
          dragFrom={2}
          items={milestones.map((row) => ({
            id: row.id,
            title: row.title || "Milestone",
            subtitle: milestoneWhenLabel(row),
            image: row.image_url,
            status: row.status,
          }))}
          onEdit={(id) => {
            const row = milestones.find((item) => item.id === id);
            if (row) {
              const shown = milestoneDateText(row.happened_on, row.date_precision || (row.happened_on ? "day" : null));
              const [year, month, day] = shown.split("-");
              openDraft({ ...row, scope: "milestone", happened_on: row.happened_on ?? "", title: row.title ?? "", year: year || "", month: month || "", day: day || "" }, "org-milestones");
            }
          }}
          onDelete={canDelete ? (id) => remove(id, "milestone") : undefined}
          onReorder={(from, to) => move("milestone", from, to)}
          emptyText="No milestones yet."
        />
      </div>
      </>
      )}
    </div>
  );
}
