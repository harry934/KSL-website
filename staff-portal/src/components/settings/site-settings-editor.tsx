"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, Notice, Switch } from "@/components/ui/form-bits";
import { RowList } from "@/components/ui/row-list";
import { useFeedback } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { sendJson } from "@/lib/upload-client";
import {
  DEFAULT_SITE_SETTINGS,
  type AnnouncementSettings,
  type BannerStyle,
  type MenuStyle,
  type SiteSettingKey,
  type SiteSettings,
} from "@/lib/site-settings";

const BANNER_STYLES: { value: BannerStyle; label: string; swatch: string }[] = [
  { value: "navy", label: "Navy with gold", swatch: "linear-gradient(100deg,#0b1f3a,#163a66)" },
  { value: "gold", label: "Gold with navy", swatch: "linear-gradient(100deg,#b48f1c,#e2bf4b)" },
  { value: "light", label: "Light and calm", swatch: "linear-gradient(100deg,#f4f7fb,#e6eef8)" },
  { value: "kenya", label: "Kenya", swatch: "linear-gradient(100deg,#0c6b3a,#bb1e24)" },
  { value: "alert", label: "Alert", swatch: "linear-gradient(100deg,#8d1d24,#c43740)" },
  { value: "forest", label: "Forest", swatch: "linear-gradient(100deg,#14382a,#1f6b48)" },
  { value: "midnight", label: "Midnight", swatch: "linear-gradient(100deg,#070d18,#c5a028)" },
  { value: "framed", label: "Framed", swatch: "linear-gradient(#fff,#fff)" },
];

const MENU_STYLES: { value: MenuStyle; label: string; hint: string }[] = [
  { value: "classic", label: "Classic", hint: "The current menu" },
  { value: "cards", label: "Cards", hint: "Rounded panels" },
  { value: "soft", label: "Soft", hint: "Light shadow" },
  { value: "line", label: "Line", hint: "Gold edge on hover" },
  { value: "compact", label: "Compact", hint: "Shorter rows" },
];

const TAG_SUGGESTIONS = ["Announcement", "Notice", "Tender", "Vacancy", "Event", "New"];

function todayInNairobi() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${iso}T12:00:00`)
  );
}

function BannerPreview({ a }: { a: AnnouncementSettings }) {
  const text = a.text.trim() || "Your message will appear here.";
  return (
    <div className={cn("kb-preview", `is-${a.style}`, a.scroll && "is-ticker")}>
      <div className="kb-preview-inner">
        <span className="kb-preview-icon">
          <Megaphone className="h-5 w-5" />
        </span>
        <span className="kb-preview-tag">{a.label.trim() || "Announcement"}</span>
        <div className="kb-preview-body">
          {a.scroll ? (
            <div className="kb-preview-track">
              <p className="kb-preview-text">{text}</p>
              <p className="kb-preview-text" aria-hidden>
                {text}
              </p>
            </div>
          ) : (
            <>
              <p className="kb-preview-text">{text}</p>
              {a.endsOn && <span className="kb-preview-until">Until {formatDay(a.endsOn)}</span>}
            </>
          )}
        </div>
        {a.linkLabel.trim() && a.linkUrl.trim() && (
          <span className="kb-preview-cta">
            {a.linkLabel.trim()}
            <ArrowRight className="h-4 w-4" />
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
        description="A wide strip just under the menu on every page. Use it for tenders, vacancies, events or important notices."
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
          <Field label="Colours">
            <details className="group relative">
              <summary className="flex h-[42px] cursor-pointer list-none items-center gap-2 rounded-[8px] border border-[#d5dce4] bg-white px-3 text-[14px] text-[#0b1f3a]">
                <span
                  className="h-4 w-7 rounded-[4px] border border-[#e3e8ee]"
                  style={{ background: BANNER_STYLES.find((s) => s.value === a.style)?.swatch }}
                />
                {BANNER_STYLES.find((s) => s.value === a.style)?.label ?? "Navy with gold"}
              </summary>
              <div className="absolute z-20 mt-1 w-full rounded-[10px] border border-[#e3e8ee] bg-white p-1 shadow-[0_12px_32px_rgba(11,31,58,0.12)]">
                {BANNER_STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-[14px] hover:bg-[#f4f6f8]",
                      a.style === s.value && "bg-[#f4f6f8] font-semibold"
                    )}
                    onClick={(event) => {
                      set("announcement", { style: s.value });
                      event.currentTarget.closest("details")?.removeAttribute("open");
                    }}
                  >
                    <span className="h-4 w-7 rounded-[4px] border border-[#e3e8ee]" style={{ background: s.swatch }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </details>
          </Field>
          <Field label="Button text" optional hint='For example "Read more" or "Apply now".'>
            <Input
              value={a.linkLabel}
              maxLength={30}
              onChange={(e) => set("announcement", { linkLabel: e.target.value })}
            />
          </Field>
          <Field label="Button opens" optional hint="A web address, or a page on this site such as careers.html.">
            <Input
              value={a.linkUrl}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://… or careers.html"
              onChange={(e) => set("announcement", { linkUrl: e.target.value.trim() })}
            />
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
              hint="The message glides across like a news ticker."
            />
          </div>
        </FieldGrid>
        {saveButton("announcement")}
      </FormSection>

      <FormSection title="Menu style" description="How the dropdown menus look on the website.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MENU_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => set("appearance", { menuStyle: style.value })}
              className={cn(
                "rounded-[10px] border px-3 py-3 text-left",
                settings.appearance.menuStyle === style.value ? "border-[#0b1f3a] bg-[#f4f7fb]" : "border-[#e3e8ee] bg-white"
              )}
            >
              <span className="block text-[14px] font-semibold text-[#0b1f3a]">{style.label}</span>
              <span className="mt-0.5 block text-[12.5px] text-[#6b7785]">{style.hint}</span>
            </button>
          ))}
        </div>
        {saveButton("appearance")}
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
