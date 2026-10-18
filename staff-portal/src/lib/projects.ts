export const PROJECT_GROUPS = [
  { value: "ship-construction", label: "Ship Construction" },
  { value: "maintenance", label: "Maintenance, Repair and Overhaul" },
  { value: "civil-works", label: "Civil and Modular Works" },
  { value: "heavy-engineering", label: "Heavy Engineering" },
] as const;

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string;
  category_label: string;
  image_path: string | null;
  sort_order: number;
  status: string;
};

export function projectGroup(category: string | null | undefined) {
  return PROJECT_GROUPS.find((group) => group.value === category) ?? PROJECT_GROUPS[0];
}

export function toPublicProjects(rows: ProjectRow[]) {
  return {
    items: rows
      .filter((row) => row.status === "published")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ({
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle ?? "",
        category: row.category,
        categoryLabel: row.category_label || projectGroup(row.category).label,
        image: row.image_path ?? "",
      })),
  };
}
