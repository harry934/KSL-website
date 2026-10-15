"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Notice, Textarea } from "@/components/ui/form-bits";
import {
  DEFAULT_SITE_SETTINGS,
  type LocationEntry,
  type SiteSettingKey,
  type SiteSettings,
} from "@/lib/site-settings";

function locationsToText(locations: LocationEntry[]) {
  return locations.map((l) => `${l.name} | ${l.address}`).join("\n");
}

function textToLocations(text: string): LocationEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split("|");
      return { name: name.trim(), address: rest.join("|").trim() };
    });
}

export function SiteSettingsEditor({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [locationsText, setLocationsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SiteSettingKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/site-settings");
    const data = await res.json();
    if (res.ok) {
      setSettings(data.settings);
      setLocationsText(locationsToText(data.settings.footer.locations ?? []));
    } else {
      setError(data.error ?? "Failed to load settings");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: SiteSettingKey) {
    setSaving(key);
    setError(null);
    setMessage(null);
    const value = key === "footer" ? { ...settings.footer, locations: textToLocations(locationsText) } : settings[key];
    const res = await fetch("/api/site-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setMessage("Saved. The public website picks this up within about a minute.");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  const set = <K extends SiteSettingKey>(key: K, patch: Partial<SiteSettings[K]>) =>
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const saveButton = (key: SiteSettingKey) =>
    canEdit && (
      <Button type="button" onClick={() => save(key)} disabled={saving !== null}>
        {saving === key ? "Saving…" : "Save"}
      </Button>
    );

  return (
    <div className="flex flex-col gap-[14px]">
      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      <section className="ksl-card space-y-4 border-t-[3px] border-t-[#c5a028] p-[18px]">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Announcement banner</h2>
        <label className="flex items-center gap-2 text-[13px] text-[#1f2933]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#0b1f3a]"
            checked={settings.announcement.enabled}
            onChange={(e) => set("announcement", { enabled: e.target.checked })}
          />
          Show a banner at the top of every public page
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Message" className="sm:col-span-2">
            <Input value={settings.announcement.text} onChange={(e) => set("announcement", { text: e.target.value })} />
          </Field>
          <Field label="Link label (optional)">
            <Input
              value={settings.announcement.linkLabel}
              onChange={(e) => set("announcement", { linkLabel: e.target.value })}
            />
          </Field>
          <Field label="Link URL (optional)">
            <Input value={settings.announcement.linkUrl} onChange={(e) => set("announcement", { linkUrl: e.target.value })} />
          </Field>
        </div>
        {saveButton("announcement")}
      </section>

      <section className="ksl-card space-y-4 p-[18px]">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Contact details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field label="WhatsApp number" hint="Digits only with country code, e.g. 254726277377">
            <Input
              value={settings.contact.whatsapp}
              onChange={(e) => set("contact", { whatsapp: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </div>
        {saveButton("contact")}
      </section>

      <section className="ksl-card space-y-4 p-[18px]">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Social media</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Facebook">
            <Input value={settings.social.facebook} onChange={(e) => set("social", { facebook: e.target.value })} />
          </Field>
          <Field label="X (Twitter)">
            <Input value={settings.social.x} onChange={(e) => set("social", { x: e.target.value })} />
          </Field>
          <Field label="Instagram">
            <Input value={settings.social.instagram} onChange={(e) => set("social", { instagram: e.target.value })} />
          </Field>
        </div>
        {saveButton("social")}
      </section>

      <section className="ksl-card space-y-4 p-[18px]">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Footer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Footer heading">
            <Input value={settings.footer.tagline} onChange={(e) => set("footer", { tagline: e.target.value })} />
          </Field>
          <Field label="Copyright line">
            <Input value={settings.footer.copyright} onChange={(e) => set("footer", { copyright: e.target.value })} />
          </Field>
          <Field label="Locations" hint='One per line: "Mombasa Shipyard | Next to Kenya Navy Base, Mtongwe."' className="sm:col-span-2">
            <Textarea value={locationsText} onChange={(e) => setLocationsText(e.target.value)} />
          </Field>
        </div>
        {saveButton("footer")}
      </section>
    </div>
  );
}
