export type Spec = { label: string; value: string };
export type RangeGroup = { title: string; items: string[] };

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  category_label: string | null;
  eyebrow: string | null;
  image_path: string | null;
  image_alt: string | null;
  key_specs: Spec[];
  extra_specs: Spec[];
  sort_order: number;
  status: string;
};

export type ProductsSettings = {
  kicker: string | null;
  title: string | null;
  intro: string | null;
  catalogue_url: string | null;
  range_kicker: string | null;
  range_title: string | null;
  range_groups: RangeGroup[];
};

export function toPublicProductsPayload(settings: ProductsSettings | null, rows: ProductRow[]) {
  const items = rows
    .filter((row) => row.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      category: row.category,
      categoryLabel: row.category_label || row.category,
      eyebrow: row.eyebrow ?? "",
      image: row.image_path ?? "",
      imageAlt: row.image_alt ?? row.name,
      keySpecs: row.key_specs ?? [],
      extraSpecs: row.extra_specs ?? [],
    }));
  return {
    kicker: settings?.kicker ?? "",
    title: settings?.title ?? "",
    intro: settings?.intro ?? "",
    catalogueUrl: settings?.catalogue_url ?? "",
    rangeKicker: settings?.range_kicker ?? "",
    rangeTitle: settings?.range_title ?? "",
    rangeGroups: settings?.range_groups ?? [],
    items,
  };
}

/** One spec per line as "Label: value". */
export function specsToText(specs: Spec[] | null | undefined) {
  return (specs ?? []).map((s) => `${s.label}: ${s.value}`).join("\n");
}

export function textToSpecs(text: string): Spec[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return { label: line, value: "" };
      return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    });
}
