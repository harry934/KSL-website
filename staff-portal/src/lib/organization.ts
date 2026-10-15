export type LeadershipRow = {
  id: string;
  role: string;
  summary: string | null;
  sort_order: number;
  status: string;
};

export type YardRow = {
  id: string;
  name: string;
  lead: string | null;
  summary: string | null;
  sort_order: number;
  status: string;
};

export function toPublicOrganization(
  chartDownloadId: string | null,
  leadership: LeadershipRow[],
  yards: YardRow[]
) {
  const pubLead = leadership
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({ role: r.role, summary: r.summary ?? "" }));

  const pubYards = yards
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      name: r.name,
      lead: r.lead ?? "",
      summary: r.summary ?? "",
    }));

  return {
    chartDownloadId: chartDownloadId ?? undefined,
    leadership: pubLead,
    yards: pubYards,
  };
}
