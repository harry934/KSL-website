"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, Notice } from "@/components/ui/form-bits";
import { RowList } from "@/components/ui/row-list";
import { useFeedback } from "@/components/ui/feedback";
import { sendJson } from "@/lib/upload-client";
import { DEFAULT_SITE_SETTINGS, type SiteSettingKey, type SiteSettings } from "@/lib/site-settings";

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

  return (
    <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-[18px]">
      {!canEdit && (
        <Notice kind="info">You can look at these settings. Only an administrator can change them.</Notice>
      )}

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
