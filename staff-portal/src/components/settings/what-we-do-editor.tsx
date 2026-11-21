"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageField } from "@/components/ui/image-field";
import { Field, FormSection, SaveBar, Select, Switch, Textarea } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { sendJson } from "@/lib/upload-client";
import { appPath } from "@/lib/base-path";
import { moveToBinConfirm } from "@/lib/recycle-copy";
import {
  blankWhatWeDoCard,
  DEFAULT_SITE_SETTINGS,
  WHAT_WE_DO_ICONS,
  type WhatWeDoCard,
} from "@/lib/site-settings";

const ICON_OPTIONS = [
  { value: "ship", label: "Ship construction" },
  { value: "civil", label: "Civil works" },
  { value: "heavy", label: "Heavy engineering" },
  { value: "mro", label: "Maintenance / MRO" },
  { value: "grp", label: "GRP boats" },
];

const PAGE_OPTIONS = [
  { value: "service.html", label: "Services" },
  { value: "products.html", label: "Products" },
  { value: "project.html", label: "Projects" },
  { value: "about.html", label: "About" },
  { value: "contact.html", label: "Contact" },
];

export function WhatWeDoEditor({ canEdit }: { canEdit: boolean }) {
  const { toast, confirm } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState(DEFAULT_SITE_SETTINGS.what_we_do.label);
  const [cards, setCards] = useState<WhatWeDoCard[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async (keepOpenId?: string | null) => {
    const res = await fetch(appPath("/api/what-we-do"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error ?? "Could not load What we do.", "error");
      setLoading(false);
      return;
    }
    const nextCards = Array.isArray(data.items) ? (data.items as WhatWeDoCard[]) : [];
    setLabel(typeof data.label === "string" && data.label.trim() ? data.label : "What we do");
    setCards(nextCards);
    const keep = keepOpenId && nextCards.some((card) => card.id === keepOpenId) ? keepOpenId : null;
    setOpenId(keep ?? nextCards[0]?.id ?? null);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchCard(id: string, patch: Partial<WhatWeDoCard>) {
    setCards((list) => list.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  }

  function moveCard(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= cards.length) return;
    setCards((list) => {
      const copy = list.slice();
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  async function removeCard(id: string) {
    const card = cards.find((item) => item.id === id);
    const ok = await confirm({
      ...moveToBinConfirm(card?.title || "Untitled card"),
      danger: true,
    });
    if (!ok) return;
    try {
      await sendJson(`/api/what-we-do?id=${encodeURIComponent(id)}`, "DELETE");
      setCards((list) => list.filter((item) => item.id !== id));
      if (openId === id) setOpenId(null);
      toast("Moved to the recycle bin.");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function save() {
    if (!canEdit) {
      toast("You can view these cards, but you cannot publish changes.", "error");
      return;
    }
    const blank = cards.find((card) => card.enabled && !card.title.trim());
    if (blank) {
      toast("Every enabled card needs a title.", "error");
      setOpenId(blank.id);
      return;
    }
    const stayOn = openId;
    setSaving(true);
    try {
      await sendJson("/api/what-we-do", "POST", { label, cards });
      toast("What we do cards saved.");
      await load(stayOn);
      if (stayOn) {
        window.setTimeout(() => {
          document.getElementById(`what-we-do-${stayOn}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
      }
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading What we do…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormSection title="Section" description="Shown above the cards on the home page.">
        <Field label="Section label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} disabled={!canEdit} />
        </Field>
      </FormSection>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Cards</h2>
        {canEdit && (
          <Button
            onClick={() => {
              const card = blankWhatWeDoCard();
              setCards((list) => [...list, card]);
              setOpenId(card.id);
            }}
          >
            <Plus className="h-4 w-4" /> New card
          </Button>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#d5dde8] bg-white px-4 py-8 text-center text-[14px] text-[#6b7785]">
          No cards yet. Add one to fill the What we do section.
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map((card, index) => {
            const open = openId === card.id;
            return (
              <div key={card.id} id={`what-we-do-${card.id}`} className="scroll-mt-24 overflow-hidden rounded-xl border border-[#d5dde8] bg-white">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#eef2f7] px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left text-[14px] font-semibold text-[#0b1f3a]"
                    onClick={() => setOpenId(open ? null : card.id)}
                  >
                    {card.title || "Untitled card"}
                    {!card.enabled && <span className="ml-2 text-[12px] font-medium text-[#98a3b1]">Hidden</span>}
                  </button>
                  {canEdit && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => moveCard(index, -1)} disabled={index === 0} aria-label="Move up">
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => moveCard(index, 1)}
                        disabled={index === cards.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void removeCard(card.id)} aria-label="Remove card">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                {open && (
                  <div className="grid items-start gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="min-w-0 space-y-4">
                      <Field label="Title">
                        <Input value={card.title} onChange={(e) => patchCard(card.id, { title: e.target.value })} disabled={!canEdit} />
                      </Field>
                      <Field label="Short summary" hint="Shown on the card face.">
                        <Textarea
                          rows={3}
                          className="min-h-[84px]"
                          value={card.excerpt}
                          onChange={(e) => patchCard(card.id, { excerpt: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Field>
                      <Field label="Full detail" hint="Shown when a visitor clicks Read More. Leave a blank line between paragraphs.">
                        <Textarea
                          className="min-h-[180px]"
                          value={card.detail}
                          onChange={(e) => patchCard(card.id, { detail: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Field>
                      <Field label="Card button label" hint="The Read More control on the card face.">
                        <Input
                          value={card.buttonLabel}
                          onChange={(e) => patchCard(card.id, { buttonLabel: e.target.value })}
                          disabled={!canEdit}
                        />
                      </Field>
                      <FormSection title="Popup buttons" description="Optional. Leave a label blank to hide that button in the Read More popup.">
                        <div className="grid gap-4 sm:grid-cols-3">
                          {(
                            [
                              { labelKey: "linkLabel" as const, linkKey: "link" as const, title: "Main button" },
                              { labelKey: "secondaryLabel" as const, linkKey: "secondaryLink" as const, title: "Second button" },
                              { labelKey: "tertiaryLabel" as const, linkKey: "tertiaryLink" as const, title: "Text link" },
                            ] as const
                          ).map((slot) => (
                            <div key={slot.labelKey} className="space-y-2 rounded-lg border border-[#e4e9ef] p-3">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5b6775]">{slot.title}</p>
                              <Field label="Label">
                                <Input
                                  value={card[slot.labelKey]}
                                  onChange={(e) => patchCard(card.id, { [slot.labelKey]: e.target.value })}
                                  disabled={!canEdit}
                                  placeholder="Leave blank to hide"
                                />
                              </Field>
                              <Field label="Goes to">
                                <Select
                                  value={PAGE_OPTIONS.some((option) => option.value === card[slot.linkKey]) ? card[slot.linkKey] : ""}
                                  onChange={(e) => patchCard(card.id, { [slot.linkKey]: e.target.value })}
                                  disabled={!canEdit}
                                >
                                  <option value="">Custom path…</option>
                                  {PAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                              {!PAGE_OPTIONS.some((option) => option.value === card[slot.linkKey]) && (
                                <Field label="Custom link">
                                  <Input
                                    value={card[slot.linkKey]}
                                    onChange={(e) => patchCard(card.id, { [slot.linkKey]: e.target.value })}
                                    disabled={!canEdit}
                                    placeholder="e.g. contact.html"
                                  />
                                </Field>
                              )}
                            </div>
                          ))}
                        </div>
                      </FormSection>
                    </div>
                    <div className="min-w-0 space-y-4">
                      <FormSection title="Visibility">
                        <Switch
                          checked={card.enabled}
                          onChange={(enabled) => patchCard(card.id, { enabled })}
                          disabled={!canEdit}
                          label={card.enabled ? "Shown on the home page" : "Hidden from the home page"}
                        />
                      </FormSection>
                      <FormSection title="Photo" description="Shown behind the card title on the home page.">
                        <ImageField
                          module="site_settings"
                          value={card.image}
                          onChange={(image) => patchCard(card.id, { image, imageSlot: image ? "" : card.imageSlot })}
                        />
                      </FormSection>
                      <Field label="Icon">
                        <Select
                          value={WHAT_WE_DO_ICONS.includes(card.icon as (typeof WHAT_WE_DO_ICONS)[number]) ? card.icon : "ship"}
                          onChange={(e) => patchCard(card.id, { icon: e.target.value })}
                          disabled={!canEdit}
                        >
                          {ICON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <SaveBar>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save What we do"}
          </Button>
        </SaveBar>
      )}
    </div>
  );
}
