export type LeadershipRow = {
  id: string;
  role: string;
  summary: string | null;
  sort_order: number;
  status: string;
};

export type BoardMemberRow = {
  id: string;
  full_name: string;
  role: string;
  board_group: string;
  summary: string | null;
  photo_url: string | null;
  sort_order: number;
  status: string;
};

export function toPublicOrganization(
  chartDownloadId: string | null,
  leadership: LeadershipRow[],
  board: BoardMemberRow[]
) {
  const pubLead = leadership
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({ role: r.role, summary: r.summary ?? "" }));

  const pubBoard = board
    .filter((r) => r.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      name: r.full_name,
      role: r.role,
      group: r.board_group,
      summary: r.summary ?? "",
      photo: r.photo_url ?? "",
    }));

  return {
    chartDownloadId: chartDownloadId ?? undefined,
    leadership: pubLead,
    board: pubBoard,
  };
}
