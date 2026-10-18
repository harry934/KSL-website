const ACTION_WORDS: Record<string, string> = {
  upsert: "saved",
  update: "saved",
  save: "saved",
  publish: "put on the website",
  delete: "deleted",
  create: "added",
  permissions: "changed what can be done by",
  profile: "updated the details of",
  "reset password": "gave a new one-time password to",
  "set active": "changed the access of",
};

const THING_WORDS: Record<string, string> = {
  faq_group: "a question group",
  faq_item: "a question",
  site_setting: "the site settings",
  site_image: "a website photo",
  services_settings: "the Services page introduction",
  service_item: "a service",
  products_settings: "the Products page text",
  product: "a boat",
  project: "a project",
  organization_board_members: "a board member",
  press_settings: "the press kit details",
  press_asset: "a press kit file",
  organization_settings: "the Organisation page",
  organization_yards: "a shipyard",
  organization_leadership: "a leader",
  news_item: "a news story",
  event_item: "an event",
  downloads_settings: "the Downloads page",
  download_item: "a document",
  csr_settings: "the Community page",
  csr_project: "a community programme",
  careers_settings: "the How to apply details",
  career_listing: "a job or internship",
  gallery_photo: "a photo",
  gallery_video: "a video",
  admin_profile: "a staff account",
};

/** Turns an activity log row into a short plain-English phrase, e.g. "saved a news story". */
export function describeActivity(row: {
  action: string;
  entity_type: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const username = typeof row.metadata?.username === "string" ? row.metadata.username : null;
  if (row.action === "sign in") return "signed in";
  if (row.action === "change password") return "changed their password";
  if (row.action === "update profile") return "updated their details";

  const verb = ACTION_WORDS[row.action] ?? row.action.replace(/_/g, " ");
  if (row.entity_type === "admin_profile") {
    const who = username ? `@${username}` : "a staff account";
    if (row.action === "create") return `added the staff account ${who}`;
    if (row.action === "delete") return `deleted the staff account ${who}`;
    return `${verb} ${who}`;
  }
  const thing = row.entity_type ? THING_WORDS[row.entity_type] ?? row.entity_type.replace(/_/g, " ") : "something";
  return `${verb} ${thing}`;
}
