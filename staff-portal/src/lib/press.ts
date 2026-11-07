import { safeLink } from "@/lib/safe-link";

export type PressAssetRow = {
  id: string;
  title: string;
  href: string | null;
  download_id: string | null;
  asset_type: string | null;
  sort_order: number;
  status: string;
};

export type PressSettings = {
  boilerplate: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export function toPublicPress(settings: PressSettings | null, assets: PressAssetRow[]) {
  const published = assets
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => {
      const item: Record<string, string | undefined> = {
        title: r.title,
        type: r.asset_type ?? undefined,
      };
      const href = r.href ? safeLink(r.href) : null;
      if (href) item.href = href;
      if (r.download_id) item.downloadId = r.download_id;
      return item;
    });

  const email = String(settings?.contact_email ?? "").trim();
  const mail = email ? safeLink(email.startsWith("mailto:") ? email : `mailto:${email}`) : null;

  return {
    boilerplate: settings?.boilerplate ?? "",
    contactEmail: mail ? email.replace(/^mailto:/i, "") : "",
    contactPhone: settings?.contact_phone ?? "",
    assets: published,
  };
}
