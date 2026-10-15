export type CareerListingRow = {
  id: string;
  kind: "vacancy" | "internship";
  title: string;
  location: string | null;
  summary: string | null;
  closing_date: string | null;
  apply_url: string | null;
  sort_order: number;
  status: string;
};

export type CareersSettings = {
  apply_email: string;
  apply_note: string | null;
};

export function toPublicCareersPayload(settings: CareersSettings | null, listings: CareerListingRow[]) {
  const published = listings
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order);

  const vacancies = published
    .filter((r) => r.kind === "vacancy")
    .map((r) => ({
      title: r.title,
      location: r.location ?? "",
      summary: r.summary ?? "",
      closingDate: r.closing_date ?? "",
      applyUrl: r.apply_url ?? undefined,
    }));

  const internships = published
    .filter((r) => r.kind === "internship")
    .map((r) => ({
      title: r.title,
      location: r.location ?? "",
      summary: r.summary ?? "",
    }));

  return {
    applyEmail: settings?.apply_email ?? "careers@kenyashipyards.co.ke",
    applyNote: settings?.apply_note ?? "",
    vacancies,
    internships,
  };
}
