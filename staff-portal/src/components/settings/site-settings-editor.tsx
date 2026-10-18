"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, Notice, Select, Switch } from "@/components/ui/form-bits";
import { RowList } from "@/components/ui/row-list";
import { useFeedback } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { sendJson } from "@/lib/upload-client";
import {
  DEFAULT_SITE_SETTINGS,
  bannerDesign,
  type AnnouncementSettings,
  type BannerDesign,
  type SiteSettingKey,
  type SiteSettings,
} from "@/lib/site-settings";

const BANNER_DESIGNS: { value: BannerDesign; label: string }[] = [
  { value: "harbour-line", label: "Harbour line" },
  { value: "keel-stripe", label: "Keel stripe" },
  { value: "signal-flag", label: "Signal flag" },
  { value: "dry-dock", label: "Dry dock" },
  { value: "tender-notice", label: "Tender notice" },
  { value: "quiet-gold", label: "Quiet gold" },
  { value: "night-watch", label: "Night watch" },
  { value: "yard-bell", label: "Yard bell" },
  { value: "split-bar", label: "Split bar" },
  { value: "brass-plate", label: "Brass plate" },
  { value: "log-entry", label: "Log entry" },
  { value: "mast-pennant", label: "Mast pennant" },
  { value: "sea-glass", label: "Sea glass" },
  { value: "alert-bar", label: "Alert bar" },
  { value: "chapter-head", label: "Chapter head" },
  { value: "inset-rule", label: "Inset rule" },
  { value: "shipyard-stamp", label: "Shipyard stamp" },
  { value: "tide", label: "Tide" },
  { value: "two-weights", label: "Two weights" },
  { value: "command-strip", label: "Command strip" },
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

const ARROW_DESIGNS = new Set<BannerDesign>(["quiet-gold", "mast-pennant"]);

const TAG_SUGGESTIONS = ["Announcement", "Notice", "Tender", "Vacancy", "Event", "New"];

function todayInNairobi() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${iso}T12:00:00`)
  );
}

function YardIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function BannerMark({ design }: { design: BannerDesign }) {
  if (design === "shipyard-stamp") return <span className="kb-preview-stamp">KSL</span>;
  const marks: Record<BannerDesign, ReactNode> = {
    "harbour-line": (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d="M8 21h8M9 21V10h6v11M8 10h8M12 10V7M9 8c2 1.2 4 1.2 6 0" />
      </svg>
    ),
    "keel-stripe": <YardIcon d="M3 15c2.2 3.2 5.4 5 9 5s6.8-1.8 9-5M3 15h18M12 7v8M12 7l5-2" />,
    "signal-flag": <YardIcon d="M5 21V3M5 4h8l-2 3 2 3H5M14 21V8M14 9h7l-2 3 2 3h-7" />,
    "dry-dock": <YardIcon d="M3 18h18M5 18l2-6h10l2 6M8 12V8h8v4M12 8V5M4 21h16" />,
    "tender-notice": <YardIcon d="M7 3h7l4 4v14H7zM14 3v4h4M9 12h6M9 16h4" />,
    "quiet-gold": (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="m15.2 8.8-1.4 4.6-4.6 1.4 1.4-4.6z" />
      </svg>
    ),
    "night-watch": <YardIcon d="M10 5h4M12 5v3M9 8h6l1 5H8zM10 13v5h4v-5M9 18h6" />,
    "yard-bell": <YardIcon d="M6 16a6 6 0 0 1 12 0M5 16h14M10 19a2 2 0 0 0 4 0M12 5v2" />,
    "split-bar": <YardIcon d="M4 20h16M7 20V7h3v13M10 9h9M19 9v5M17 14h4" />,
    "brass-plate": (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
    ),
    "log-entry": <YardIcon d="M8 4h8v3H8zM8 6H6v14h12V6h-2M9 12h6M9 16h4" />,
    "mast-pennant": <YardIcon d="M6 3v18M6 4h11l-3.5 4L17 12H6" />,
    "sea-glass": <YardIcon d="M3 9c2 2 4 2 6 0s4-2 6 0 4 2 6 0M3 15c2 2 4 2 6 0s4-2 6 0 4 2 6 0" />,
    "alert-bar": <YardIcon d="M12 4 3 19h18zM12 9v5M12 17h.01" />,
    "chapter-head": (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M5 18h14M7 18 12 6l5 12" />
        <circle cx="12" cy="8" r="1.4" />
      </svg>
    ),
    "inset-rule": <YardIcon d="M4 12h16M7 8 4 12l3 4M17 8l3 4-3 4M12 8v8" />,
    "shipyard-stamp": null,
    tide: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 21V9M5 13H3a9 9 0 0 0 18 0h-2" />
        <circle cx="12" cy="6" r="2.4" />
      </svg>
    ),
    "two-weights": (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="8" cy="14" r="3" />
        <circle cx="16" cy="14" r="3" />
        <path d="M11 14h2M9 11l1.5-5h3L15 11" />
      </svg>
    ),
    "command-strip": (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v5M12 15v5M4 12h5M15 12h5" />
      </svg>
    ),
  };
  return marks[design];
}

function BannerPreview({ a, picker = false }: { a: AnnouncementSettings; picker?: boolean }) {
  const text = a.text.trim() || "Your message will appear here.";
  const design = bannerDesign(a.style);
  const label = a.linkLabel.trim();
  const showButton = Boolean(label && a.linkUrl.trim());
  const circle = design === "mast-pennant";
  return (
    <div className={cn("kb-preview", `is-${design}`, a.scroll && "is-ticker", picker && "is-picker")}>
      <div className="kb-preview-inner">
        <span className="kb-preview-icon">
          <BannerMark design={design} />
        </span>
        <span className="kb-preview-tag">{a.label.trim() || "Announcement"}</span>
        <div className="kb-preview-body">
          {a.scroll ? (
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
            {circle ? <span className="sr-only">{label}</span> : label}
            {ARROW_DESIGNS.has(design) && <ArrowRight className="h-4 w-4" />}
          </span>
        )}
      </div>
      <span className="kb-preview-close" aria-hidden>
        <X className="h-4 w-4" />
      </span>
    </div>
  );
}

export function SiteSettingsEditor({ canEdit }: { canEdit: boolean }) {
  const { toast } = useFeedback();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<SiteSettingKey | null>(null);
  const [customLink, setCustomLink] = useState(false);

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
      const a = settings.announcement;
      if (a.enabled && !a.text.trim()) {
        toast("Write a message before switching the banner on.", "error");
        return;
      }
      if (a.linkLabel.trim() && !a.linkUrl.trim()) {
        toast("Add the web link the button should open, or clear the button text.", "error");
        return;
      }
    }
    setSaving(key);
    try {
      await sendJson("/api/site-settings", "POST", { key, value });
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
  const expired = !!a.endsOn && a.endsOn < todayInNairobi();

  return (
    <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-[18px]">
      {!canEdit && (
        <Notice kind="info">You can look at these settings. Only an administrator can change them.</Notice>
      )}

      <FormSection
        title="Website banner"
        description="A strip at the top of every page, above the menu. Use it for tenders, vacancies, events or important notices. The preview updates as you edit. The public site changes when you save."
      >
        <div className="space-y-2">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#8a96a5]">Preview</p>
          <div className="overflow-hidden rounded-[10px] border border-[#e3e8ee] bg-white">
            <div className="flex items-center gap-2 border-b border-[#eef1f4] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e3e8ee]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e3e8ee]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e3e8ee]" />
              <span className="ml-3 text-[12px] font-semibold text-[#0b1f3a]">Kenya Shipyards Limited</span>
              <span className="ml-auto hidden gap-4 text-[11.5px] text-[#6b7785] sm:flex">
                <span>Home</span>
                <span>About</span>
                <span>Services</span>
                <span>Contact</span>
              </span>
            </div>
            <BannerPreview a={a} />
            <div className="h-10 bg-[linear-gradient(180deg,#f4f6f9,#fff)]" />
          </div>
          {!a.enabled && (
            <p className="text-[12.5px] text-[#6b7785]">The banner is switched off, so visitors will not see it.</p>
          )}
          {a.enabled && expired && (
            <p className="text-[12.5px] text-[#b42318]">
              The end date has passed, so visitors no longer see this banner. Change or clear the date to show it again.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#8a96a5]">Designs</p>
          <p className="text-[12.5px] text-[#6b7785]">
            Click one to try it in the preview above. Each has its own yard mark. Save when you are ready.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {BANNER_DESIGNS.map((design) => {
              const selected = bannerDesign(a.style) === design.value;
              return (
                <button
                  key={design.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => set("announcement", { style: design.value })}
                  className={cn(
                    "overflow-hidden rounded-[10px] border bg-white text-left",
                    selected ? "border-[#0b1f3a] ring-2 ring-[#0b1f3a]" : "border-[#e3e8ee] hover:border-[#9aabbd]"
                  )}
                >
                  <BannerPreview
                    picker
                    a={{
                      ...a,
                      style: design.value,
                      scroll: false,
                      linkLabel: a.linkLabel.trim() || "Open",
                      linkUrl: a.linkUrl.trim() || "index.html",
                    }}
                  />
                  <span className="block border-t border-[#eef1f4] px-3 py-2 text-[13px] font-semibold text-[#0b1f3a]">
                    {design.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Switch
          checked={a.enabled}
          onChange={(on) => set("announcement", { enabled: on })}
          label={a.enabled ? "Banner is on" : "Banner is off"}
          hint="Switch on to show the banner on every page of the website."
        />

        <Field label="Message" hint="Keep it short: one sentence works best.">
          <Input
            value={a.text}
            maxLength={220}
            placeholder="e.g. Tender for supply of marine paint is now open. Closing date 30 November."
            onChange={(e) => set("announcement", { text: e.target.value })}
          />
        </Field>

        <FieldGrid>
          <Field label="Small tag" hint="The short word at the start, such as Tender or Vacancy.">
            <Input
              value={a.label}
              maxLength={24}
              list="banner-tag-suggestions"
              placeholder="Announcement"
              onChange={(e) => set("announcement", { label: e.target.value })}
            />
            <datalist id="banner-tag-suggestions">
              {TAG_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Button text" optional hint='For example "Read more" or "Apply now".'>
            <Input
              value={a.linkLabel}
              maxLength={30}
              onChange={(e) => set("announcement", { linkLabel: e.target.value })}
            />
          </Field>
          <Field label="Button opens" optional hint="Pick a page on this site, or a web address of your own.">
            <Select
              value={
                customLink || (a.linkUrl && !BANNER_PAGES.some((p) => p.value === a.linkUrl))
                  ? "custom"
                  : a.linkUrl
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value === "custom") {
                  setCustomLink(true);
                  if (BANNER_PAGES.some((p) => p.value === a.linkUrl)) set("announcement", { linkUrl: "" });
                  return;
                }
                setCustomLink(false);
                set("announcement", { linkUrl: value });
              }}
            >
              <option value="">Choose a page</option>
              {BANNER_PAGES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom web address</option>
            </Select>
            {(customLink || (a.linkUrl && !BANNER_PAGES.some((p) => p.value === a.linkUrl))) && (
              <Input
                className="mt-2"
                value={a.linkUrl}
                autoCapitalize="none"
                spellCheck={false}
                placeholder="https://"
                onChange={(e) => set("announcement", { linkUrl: e.target.value.trim() })}
              />
            )}
          </Field>
          <Field label="Stop showing after" optional hint="The banner hides itself after this day. Leave empty to keep it up.">
            <div className="flex gap-2">
              <Input
                type="date"
                value={a.endsOn}
                onChange={(e) => set("announcement", { endsOn: e.target.value })}
              />
              {a.endsOn && (
                <Button variant="ghost" onClick={() => set("announcement", { endsOn: "" })}>
                  Clear
                </Button>
              )}
            </div>
          </Field>
          <div className="sm:pt-7">
            <Switch
              checked={a.scroll}
              onChange={(on) => set("announcement", { scroll: on })}
              label="Moving text"
              hint="The message travels the full width of the banner."
            />
          </div>
        </FieldGrid>
        {saveButton("announcement")}
      </FormSection>

      <FormSection title="Contact details" description="Shown at the top of every page and in the footer.">
        <FieldGrid>
          <Field label="Inquiries phone">
            <Input value={settings.contact.phone} onChange={(e) => set("contact", { phone: e.target.value })} />
          </Field>
          <Field label="Inquiries email">
            <Input value={settings.contact.email} onChange={(e) => set("contact", { email: e.target.value })} />
          </Field>
          <Field label="Office of the MD phone">
            <Input value={settings.contact.mdPhone} onChange={(e) => set("contact", { mdPhone: e.target.value })} />
          </Field>
          <Field label="Office of the MD email">
            <Input value={settings.contact.mdEmail} onChange={(e) => set("contact", { mdEmail: e.target.value })} />
          </Field>
          <Field label="Postal address">
            <Input
              value={settings.contact.postalAddress}
              onChange={(e) => set("contact", { postalAddress: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp number" hint="Numbers only, starting with the country code. For example 254726277377.">
            <Input
              value={settings.contact.whatsapp}
              inputMode="numeric"
              onChange={(e) => set("contact", { whatsapp: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </FieldGrid>
        {saveButton("contact")}
      </FormSection>

      <FormSection title="Social media" description="Leave a box empty to hide that icon on the website.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Facebook page">
            <Input value={settings.social.facebook} onChange={(e) => set("social", { facebook: e.target.value })} />
          </Field>
          <Field label="X (Twitter) page">
            <Input value={settings.social.x} onChange={(e) => set("social", { x: e.target.value })} />
          </Field>
          <Field label="Instagram page">
            <Input value={settings.social.instagram} onChange={(e) => set("social", { instagram: e.target.value })} />
          </Field>
        </div>
        {saveButton("social")}
      </FormSection>

      <FormSection title="Footer" description="The dark section at the bottom of every page.">
        <FieldGrid>
          <Field label="Footer heading">
            <Input value={settings.footer.tagline} onChange={(e) => set("footer", { tagline: e.target.value })} />
          </Field>
          <Field label="Copyright line">
            <Input value={settings.footer.copyright} onChange={(e) => set("footer", { copyright: e.target.value })} />
          </Field>
        </FieldGrid>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-[#1f2933]">Our locations</p>
          <RowList
            items={settings.footer.locations}
            onChange={(locations) => set("footer", { locations })}
            newItem={() => ({ name: "", address: "" })}
            addLabel="Add location"
            emptyText="No locations yet."
            renderRow={(loc, update) => (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <Input value={loc.name} placeholder="Place name" onChange={(e) => update({ name: e.target.value })} />
                <Input value={loc.address} placeholder="Where it is" onChange={(e) => update({ address: e.target.value })} />
              </div>
            )}
          />
        </div>
        {saveButton("footer")}
      </FormSection>
    </fieldset>
  );
}
