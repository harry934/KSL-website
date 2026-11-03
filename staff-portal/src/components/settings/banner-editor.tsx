"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageField } from "@/components/ui/image-field";
import { Field, FieldGrid, FormSection, Notice, Select, Switch } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { sendJson } from "@/lib/upload-client";
import {
  BANNER_QUEUE_LIMIT,
  DEFAULT_SITE_SETTINGS,
  acceptedBannerLink,
  bannerDesign,
  bannerInWindow,
  bannerPlacement,
  blankBanner,
  normalizeAnnouncement,
  todayInNairobi,
  type AnnouncementSettings,
  type BannerDesign,
  type BannerItem,
  type SiteSettingKey,
  type SiteSettings,
  type YardPhotos,
} from "@/lib/site-settings";

const BANNER_GROUPS: { label: string; designs: { value: BannerDesign; label: string }[] }[] = [
  {
    label: "On the menu",
    designs: [
      { value: "notice", label: "Notice" },
      { value: "navy", label: "Navy" },
      { value: "tide", label: "Tide" },
      { value: "flag", label: "Flag" },
      { value: "split", label: "Split" },
      { value: "pennant", label: "Pennant" },
      { value: "plate", label: "Plate" },
      { value: "night", label: "Night" },
      { value: "tender", label: "Tender" },
      { value: "alert", label: "Alert" },
      { value: "nav-line", label: "Nav line" },
    ],
  },
  {
    label: "With a yard photo",
    designs: [
      { value: "quay", label: "Quay" },
      { value: "berth", label: "Berth" },
      { value: "channel", label: "Channel" },
    ],
  },
];

const BANNER_PAGES = [
  { value: "index.html", label: "Home" },
  { value: "about.html", label: "About" },
  { value: "board.html", label: "Board" },
  { value: "organization.html", label: "Organization" },
  { value: "service.html", label: "Services" },
  { value: "products.html", label: "Products" },
  { value: "project.html", label: "Projects" },
  { value: "news.html", label: "News" },
  { value: "videos.html", label: "Gallery" },
  { value: "downloads.html", label: "Downloads" },
  { value: "careers.html", label: "Careers" },
  { value: "csr.html", label: "CSR" },
  { value: "sustainability.html", label: "Sustainability" },
  { value: "faq.html", label: "FAQ" },
  { value: "contact.html", label: "Contact" },
];


const TAG_SUGGESTIONS = ["Announcement", "Notice", "Tender", "Vacancy", "Event", "New"];

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${iso}T12:00:00`)
  );
}

function BannerMark({ design }: { design: BannerDesign }) {
  if (design === "tide") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 21V9M5 13H3a9 9 0 0 0 18 0h-2" />
        <circle cx="12" cy="6" r="2.4" />
      </svg>
    );
  }
  if (design === "alert") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 4 3 19h18zM12 9v5M12 17h.01" />
      </svg>
    );
  }
  return null;
}

function BannerPreview({ a, photo = "", picker = false }: { a: Pick<AnnouncementSettings, "text" | "label" | "linkLabel" | "linkUrl" | "style" | "scroll" | "endsOn">; photo?: string; picker?: boolean }) {
  const text = a.text.trim() || "Your message will appear here.";
  const design = bannerDesign(a.style);
  const place = bannerPlacement(design);
  const label = a.linkLabel.trim();
  const showButton = Boolean(label && a.linkUrl.trim());
  const moving = a.scroll && place === "bar";
  const safePhoto = photo.replace(/["'()\\]/g, "");
  return (
    <div
      className={cn("kb-preview", `is-${design}`, moving && "is-ticker", picker && "is-picker")}
      style={safePhoto ? ({ "--ksl-banner-photo": `url("${safePhoto}")` } as React.CSSProperties) : undefined}
    >
      <div className="kb-preview-inner">
        <span className="kb-preview-icon">
          <BannerMark design={design} />
        </span>
        <span className="kb-preview-tag">{a.label.trim() || "Announcement"}</span>
        <div className="kb-preview-body">
          {moving ? (
            <div className="kb-preview-track">
              {[0, 1].map((copy) => (
                <p className="kb-preview-text" key={copy} aria-hidden={copy === 1 || undefined}>
                  {text}
                </p>
              ))}
            </div>
          ) : (
            <>
              <p className="kb-preview-text">{text}</p>
              {a.endsOn && <span className="kb-preview-until">Until {formatDay(a.endsOn)}</span>}
            </>
          )}
        </div>
        {showButton && (
          <span className="kb-preview-cta">
            {label}
          </span>
        )}
      </div>
      <span className="kb-preview-close" aria-hidden>
        <X className="h-4 w-4" />
      </span>
    </div>
  );
}

export function BannerEditor({ canEdit }: { canEdit: boolean }) {
  const { toast, confirm } = useFeedback();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<SiteSettingKey | null>(null);
  const [customFor, setCustomFor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState<"desk" | "phone">("desk");

  const load = useCallback(async () => {
    try {
      const data = await sendJson("/api/site-settings", "GET");
      setSettings(data.settings);
    } catch (err) {
      setLoadError((err as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: SiteSettingKey) {
    let value: unknown = settings[key];
    if (key === "footer") {
      value = {
        ...settings.footer,
        locations: settings.footer.locations
          .map((l) => ({ name: l.name.trim(), address: l.address.trim() }))
          .filter((l) => l.name || l.address),
      };
    }
    if (key === "announcement") {
      const queue = settings.announcement.queue;
      for (const item of queue) {
        if (item.enabled && !item.text.trim()) {
          toast("Write a message for each banner that is switched on.", "error");
          setSelectedId(item.id);
          return;
        }
        if (item.linkLabel.trim() && !item.linkUrl.trim()) {
          toast("Add the web link the button should open, or clear the button text.", "error");
          setSelectedId(item.id);
          return;
        }
        if (item.startsOn && item.endsOn && item.startsOn > item.endsOn) {
          toast("The start date has to be on or before the end date.", "error");
          setSelectedId(item.id);
          return;
        }
        if (item.linkUrl.trim() && !acceptedBannerLink(item.linkUrl)) {
          toast("Use a normal web address for the button, starting with https://, or pick a page on this site.", "error");
          setSelectedId(item.id);
          return;
        }
      }
      value = normalizeAnnouncement(settings.announcement, true);
    }
    setSaving(key);
    try {
      await sendJson("/api/site-settings", "POST", { key, value });
      if (key === "announcement") {
        setSettings((prev) => ({ ...prev, announcement: value as AnnouncementSettings }));
      }
      toast("Saved. The website updates within about a minute.");
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  if (loadError) return <Notice kind="error">{loadError}</Notice>;

  const set = <K extends SiteSettingKey>(key: K, patch: Partial<SiteSettings[K]>) =>
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const saveButton = (key: SiteSettingKey) =>
    canEdit && (
      <div className="flex justify-end border-t border-[#eef1f4] pt-4">
        <Button variant="primary" onClick={() => save(key)} disabled={saving !== null}>
          {saving === key ? "Saving…" : "Save"}
        </Button>
      </div>
    );

  const a = settings.announcement;
  const queue = a.queue ?? [];
  const item = queue.find((row) => row.id === selectedId) ?? queue[0] ?? null;
  const today = todayInNairobi();
  const live = queue.find((row) => row.enabled && row.text.trim() && bannerInWindow(row, today)) ?? null;
  const design = item ? bannerDesign(item.style) : "navy";
  const yardPhoto = design === "quay" || design === "berth" || design === "channel" ? a.photos[design] : "";
  const bannerPlace = bannerPlacement(design);
  const showCustom = Boolean(item && (customFor === item.id || (item.linkUrl && !BANNER_PAGES.some((page) => page.value === item.linkUrl))));

  function patchItem(id: string, patch: Partial<BannerItem>) {
    setSettings((prev) => ({
      ...prev,
      announcement: {
        ...prev.announcement,
        queue: prev.announcement.queue.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      },
    }));
  }

  function patchPhotos(patch: Partial<YardPhotos>) {
    setSettings((prev) => ({
      ...prev,
      announcement: { ...prev.announcement, photos: { ...prev.announcement.photos, ...patch } },
    }));
  }

  function addBanner() {
    if (queue.length >= BANNER_QUEUE_LIMIT) {
      toast(`You can queue up to ${BANNER_QUEUE_LIMIT} banners.`, "error");
      return;
    }
    const next = blankBanner();
    setSettings((prev) => ({
      ...prev,
      announcement: { ...prev.announcement, queue: [...prev.announcement.queue, next] },
    }));
    setSelectedId(next.id);
  }

  function moveBanner(id: string, direction: -1 | 1) {
    setSettings((prev) => {
      const list = [...prev.announcement.queue];
      const index = list.findIndex((row) => row.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= list.length) return prev;
      const [row] = list.splice(index, 1);
      list.splice(target, 0, row);
      return { ...prev, announcement: { ...prev.announcement, queue: list } };
    });
  }

  async function removeBanner(row: BannerItem) {
    const ok = await confirm({
      title: "Remove this banner from the queue?",
      message: "It is removed from the queue and saved right away.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    const nextQueue = queue.filter((entry) => entry.id !== row.id);
    const nextIndex = Math.max(0, queue.findIndex((entry) => entry.id === row.id));
    const nextSelected = nextQueue[Math.min(nextIndex, Math.max(0, nextQueue.length - 1))]?.id ?? null;
    const nextAnnouncement = normalizeAnnouncement({ ...settings.announcement, queue: nextQueue }, true);
    setSettings((prev) => ({ ...prev, announcement: nextAnnouncement }));
    setSelectedId(nextSelected);
    setSaving("announcement");
    try {
      await sendJson("/api/site-settings", "POST", { key: "announcement", value: nextAnnouncement });
      toast(nextQueue.length ? "Banner removed." : "Banner removed. The queue is empty.");
    } catch (err) {
      toast((err as Error).message, "error");
      await load();
    }
    setSaving(null);
  }

  function queueStatus(row: BannerItem) {
    if (!row.enabled) return "Off";
    if (!row.text.trim()) return "Needs a message";
    if (row.startsOn && today < row.startsOn) return "Scheduled";
    if (row.endsOn && today > row.endsOn) return "Ended";
    if (live?.id === row.id) return "On the website";
    return "Waiting";
  }

  return (
    <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-[18px]">
      {!canEdit && (
        <Notice kind="info">You can look at these settings. Only an administrator can change them.</Notice>
      )}

      <FormSection
        title="Website banner"
        description="Queue several notices and the website shows the first one that is switched on and whose dates include today. Most designs sit above the menu, and Nav line sits inside it. The public site changes when you save."
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#8a96a5]">Preview</p>
            <div className="flex border border-[#d5dce4]">
              <button type="button" className={`px-3 py-1 text-[12.5px] font-semibold ${previewFrame === "desk" ? "bg-[#0b1f3a] text-white" : "bg-white text-[#0b1f3a]"}`} onClick={() => setPreviewFrame("desk")}>
                Desktop
              </button>
              <button type="button" className={`px-3 py-1 text-[12.5px] font-semibold ${previewFrame === "phone" ? "bg-[#0b1f3a] text-white" : "bg-white text-[#0b1f3a]"}`} onClick={() => setPreviewFrame("phone")}>
                Phone
              </button>
            </div>
          </div>
          <div className={previewFrame === "phone" ? "mx-auto w-[390px] max-w-full" : ""}>
          <div className="relative overflow-hidden rounded-[10px] border border-[#e3e8ee] bg-white">
            <div className="flex items-center gap-2 border-b border-[#eef1f4] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e3e8ee]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e3e8ee]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e3e8ee]" />
              <span className="ml-3 text-[12px] font-semibold text-[#0b1f3a]">Kenya Shipyards Limited</span>
              {item && bannerPlace === "nav" ? (
                <span className="ml-auto max-w-[46%]">
                  <BannerPreview a={item} photo={yardPhoto} />
                </span>
              ) : (
                <span className="ml-auto hidden gap-4 text-[11.5px] text-[#6b7785] sm:flex">
                  <span>Home</span>
                  <span>About</span>
                  <span>Services</span>
                  <span>Contact</span>
                </span>
              )}
            </div>
            {item && bannerPlace === "bar" && <BannerPreview a={item} photo={yardPhoto} />}
            <div className="relative h-16 bg-[linear-gradient(180deg,#f4f6f9,#fff)]" />
          </div>
          </div>
          {!item && (
            <p className="text-[12.5px] text-[#6b7785]">Add a banner to see the preview.</p>
          )}
          {item && !item.enabled && (
            <p className="text-[12.5px] text-[#6b7785]">This banner is switched off, so visitors will not see it.</p>
          )}
          {item && item.enabled && item.startsOn && today < item.startsOn && (
            <p className="text-[12.5px] text-[#6b7785]">This banner starts on {formatDay(item.startsOn)}.</p>
          )}
          {item && item.enabled && item.endsOn && item.endsOn < today && (
            <p className="text-[12.5px] text-[#b42318]">
              The end date has passed, so visitors no longer see this banner. Change or clear the date to show it again.
            </p>
          )}
          {item && live && live.id !== item.id && item.enabled && bannerInWindow(item, today) && item.text.trim() && (
            <p className="text-[12.5px] text-[#6b7785]">
              Visitors see “{live.label.trim() || live.text.trim() || "the earlier banner"}” today. This one shows when that one ends or is switched off.
            </p>
          )}
          {item && live?.id === item.id && (
            <p className="text-[12.5px] text-[#6b7785]">Visitors see this banner today.</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#8a96a5]">Queue</p>
            <Button type="button" variant="secondary" size="sm" onClick={addBanner}>
              <Plus className="h-4 w-4" />
              Add a banner
            </Button>
          </div>
          {queue.length === 0 ? (
            <p className="text-[13px] text-[#6b7785]">No banners yet. Add one, or several, then save.</p>
          ) : (
            <ul className="divide-y divide-[#eef1f4] rounded-[8px] border border-[#e3e8ee]">
              {queue.map((row, index) => {
                const active = item?.id === row.id;
                return (
                  <li key={row.id} className={cn("flex items-center gap-2 px-3 py-2", active && "bg-[#f4f7fb]")}>
                    <div
                      role="button"
                      tabIndex={0}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      onClick={() => setSelectedId(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(row.id);
                        }
                      }}
                    >
                      <span className="block truncate text-[14px] font-semibold text-[#0b1f3a]">
                        {index + 1}. {row.label.trim() || "Announcement"}
                        {row.text.trim() ? ` — ${row.text.trim()}` : ""}
                      </span>
                      <span className="text-[12px] text-[#6b7785]">
                        {BANNER_GROUPS.flatMap((group) => group.designs).find((entry) => entry.value === bannerDesign(row.style))?.label} · {queueStatus(row)}
                      </span>
                    </div>
                    <button type="button" className="rounded p-1 text-[#5b6775] hover:bg-[#eef2f6] disabled:opacity-40" aria-label="Move up" disabled={index === 0} onClick={() => moveBanner(row.id, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded p-1 text-[#5b6775] hover:bg-[#eef2f6] disabled:opacity-40" aria-label="Move down" disabled={index === queue.length - 1} onClick={() => moveBanner(row.id, 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-[#b42318] hover:bg-[#fdecec] disabled:opacity-40"
                      aria-label="Remove from queue"
                      disabled={saving !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeBanner(row);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#8a96a5]">Photos for Quay, Berth and Channel</p>
          <p className="text-[13px] text-[#6b7785]">Each of those three designs uses its own photo. Leave one empty to keep the current shipyard picture.</p>
          <FieldGrid>
            {(["quay", "berth", "channel"] as const).map((yard) => (
              <Field key={yard} label={yard === "quay" ? "Quay" : yard === "berth" ? "Berth" : "Channel"}>
                <ImageField module="site_settings" value={a.photos[yard]} onChange={(url) => patchPhotos({ [yard]: url })} />
              </Field>
            ))}
          </FieldGrid>
        </div>

        {item && (
          <>
            <div className="space-y-4">
              {BANNER_GROUPS.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#8a96a5]">{group.label}</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={group.label}>
                    {group.designs.map((option) => {
                      const selected = bannerDesign(item.style) === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => patchItem(item.id, { style: option.value })}
                          className={cn(
                            "rounded-full border px-4 py-2 text-[13px] font-semibold",
                            selected ? "border-[#0b1f3a] bg-[#0b1f3a] text-white" : "border-[#d5dde6] bg-white text-[#0b1f3a] hover:border-[#0b1f3a]"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Switch
              checked={item.enabled}
              onChange={(on) => patchItem(item.id, { enabled: on })}
              label={item.enabled ? "This banner is on" : "This banner is off"}
              hint="Switch on to include it in the queue. Only one banner shows at a time."
            />

            <Field label="Message" hint="Keep it short: one sentence works best.">
              <Input
                value={item.text}
                maxLength={220}
                placeholder="e.g. Tender for supply of marine paint is now open. Closing date 30 November."
                onChange={(e) => patchItem(item.id, { text: e.target.value })}
              />
            </Field>

            <FieldGrid>
              <Field label="Small tag" hint="The short word at the start, such as Tender or Vacancy.">
                <Input
                  value={item.label}
                  maxLength={24}
                  list="banner-tag-suggestions"
                  placeholder="Announcement"
                  onChange={(e) => patchItem(item.id, { label: e.target.value })}
                />
                <datalist id="banner-tag-suggestions">
                  {TAG_SUGGESTIONS.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </Field>
              <Field label="Button text" optional hint='For example "Read more" or "Apply now".'>
                <Input
                  value={item.linkLabel}
                  maxLength={30}
                  onChange={(e) => patchItem(item.id, { linkLabel: e.target.value })}
                />
              </Field>
              <Field label="Button opens" optional hint="Pick a page on this site, or a web address of your own.">
                <Select
                  value={showCustom ? "custom" : item.linkUrl}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "custom") {
                      setCustomFor(item.id);
                      if (BANNER_PAGES.some((page) => page.value === item.linkUrl)) patchItem(item.id, { linkUrl: "" });
                      return;
                    }
                    setCustomFor(null);
                    patchItem(item.id, { linkUrl: value });
                  }}
                >
                  <option value="">Choose a page</option>
                  {BANNER_PAGES.map((page) => (
                    <option key={page.value} value={page.value}>
                      {page.label}
                    </option>
                  ))}
                  <option value="custom">Custom web address</option>
                </Select>
                {showCustom && (
                  <Input
                    className="mt-2"
                    value={item.linkUrl}
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="https://"
                    onChange={(e) => patchItem(item.id, { linkUrl: e.target.value.trim() })}
                  />
                )}
              </Field>
              <Field label="Start showing on" optional hint="Leave empty to let this banner show as soon as the one above it ends.">
                <div className="flex gap-2">
                  <Input type="date" value={item.startsOn} onChange={(e) => patchItem(item.id, { startsOn: e.target.value })} />
                  {item.startsOn && (
                    <Button variant="ghost" onClick={() => patchItem(item.id, { startsOn: "" })}>
                      Clear
                    </Button>
                  )}
                </div>
              </Field>
              <Field label="Stop showing after" optional hint="The banner hides itself after this day. Leave empty to keep it up.">
                <div className="flex gap-2">
                  <Input type="date" value={item.endsOn} onChange={(e) => patchItem(item.id, { endsOn: e.target.value })} />
                  {item.endsOn && (
                    <Button variant="ghost" onClick={() => patchItem(item.id, { endsOn: "" })}>
                      Clear
                    </Button>
                  )}
                </div>
              </Field>
              <div className="sm:pt-7">
                <Switch
                  checked={item.scroll}
                  onChange={(on) => patchItem(item.id, { scroll: on })}
                  label="Moving text"
                  hint="The message travels the full width of the banner."
                />
              </div>
            </FieldGrid>
          </>
        )}
        {saveButton("announcement")}
      </FormSection>

    </fieldset>
  );
}
