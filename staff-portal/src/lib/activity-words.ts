const ACTION_WORDS: Record<string, string> = {
  upsert: "saved",
  update: "saved",
  save: "saved",
  publish: "put on the website",
  delete: "deleted",
  purge: "deleted permanently",
  restore: "restored",
  create: "added",
  permissions: "changed what can be done by",
  profile: "updated the details of",
  "reset password": "sent a password reset invite to",
  invite: "invited",
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
  website_message: "a message",
  admin_profile: "a staff account",
  staff_invite: "a staff invite",
};

/** Turns an activity log row into a short plain-English phrase, e.g. "saved a news story". */
export function describeActivity(row: {
  action: string;
  entity_type: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const username = typeof row.metadata?.username === "string" ? row.metadata.username : null;
  if (row.action === "sign in") return "signed in";
  if (row.action === "set role") {
    const who = username ? `@${username}` : "a staff account";
    return row.metadata?.superAdmin ? `made ${who} an administrator with full access` : `changed ${who} back to an agent`;
  }
  if (row.action === "change password") return "changed their password";
  if (row.action === "update profile") return "updated their details";
  if (row.action === "request username") {
    return username ? `asked to sign in as @${username}` : "asked for a new username";
  }
  if (row.action === "request password") return "asked for a new password";
  if (row.action === "approve username") return username ? `approved the username @${username}` : "approved a username change";
  if (row.action === "reject request") return "rejected an account request";
  if (row.action === "invite") return "sent a staff invite";
  if (row.action === "cancel invite") return "cancelled a staff invite";

  const verb = ACTION_WORDS[row.action] ?? row.action.replace(/_/g, " ");
  if (row.entity_type === "admin_profile") {
    const who = username ? `@${username}` : "a staff account";
    if (row.action === "create") {
      return row.metadata?.superAdmin ? `added ${who} as an administrator` : `added the staff account ${who}`;
    }
    if (row.action === "delete") return `moved the staff account ${who} to the recycle bin`;
    return `${verb} ${who}`;
  }
  const thing = row.entity_type ? THING_WORDS[row.entity_type] ?? row.entity_type.replace(/_/g, " ") : "something";
  return `${verb} ${thing}`;
}
