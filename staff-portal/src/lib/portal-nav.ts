import { MODULE_GROUPS, MODULE_LABELS, MODULE_ROUTES, type ModuleKey, type ModulePermission } from "@/lib/modules";
import { RECYCLE_MODULES } from "@/lib/recycle-sources";

/** Sidebar is used only when a person has more destinations than this. */
export const SIDEBAR_ITEM_LIMIT = 6;

export type PortalAccess = {
  isSuperAdmin: boolean;
  permissions: ModulePermission[];
};

export type PortalNavKind = "dashboard" | "module" | "banner" | "what_we_do" | "images" | "board" | "drafts" | "recycle" | "audit";

export type PortalNavLink = {
  href: string;
  label: string;
  kind: PortalNavKind;
  module?: ModuleKey;
  group: string | null;
};

export type PortalNavGroup = {
  label: string | null;
  links: PortalNavLink[];
};

function canSee(access: PortalAccess, key: ModuleKey) {
  if (access.isSuperAdmin) return true;
  if (key === "staff") return false;
  return access.permissions.some((permission) => permission.module_key === key && permission.can_view);
}

/** Drafts are for people who can publish, including full access. Super admins can publish every section. */
export function canReviewDrafts(access: PortalAccess) {
  if (access.isSuperAdmin) return true;
  return access.permissions.some((permission) => permission.can_publish);
}

function canOpenBin(access: PortalAccess) {
  if (access.isSuperAdmin) return true;
  return access.permissions.some(
    (permission) =>
      RECYCLE_MODULES.includes(permission.module_key) && (permission.can_view || permission.can_delete)
  );
}

/** Every sidebar destination, in menu order. Dashboard is included. */
export function portalNavGroups(access: PortalAccess): PortalNavGroup[] {
  const groups: PortalNavGroup[] = [
    {
      label: "Overview",
      links: [
        { href: "/", label: "Dashboard", kind: "dashboard", group: "Overview" },
        ...(canReviewDrafts(access)
          ? [{ href: "/drafts", label: "Drafts", kind: "drafts" as const, group: "Overview" }]
          : []),
      ],
    },
  ];

  for (const group of MODULE_GROUPS) {
    const links: PortalNavLink[] = group.modules
      .filter((key) => canSee(access, key))
      .map((key) => ({
        href: MODULE_ROUTES[key],
        label: MODULE_LABELS[key],
        kind: "module" as const,
        module: key,
        group: group.label,
      }));

    if (group.label === "Organisation") {
      const organisation = links.findIndex((link) => link.module === "organization");
      if (organisation >= 0) {
        links.splice(organisation + 1, 0, {
          href: "/board",
          label: "Board",
          kind: "board",
          group: group.label,
        });
      }
    }

    if (group.label === "Website" && canSee(access, "site_settings")) {
      links.push(
        { href: "/banner", label: "Banner", kind: "banner", group: group.label },
        { href: "/what-we-do", label: "What we do", kind: "what_we_do", group: group.label },
        { href: "/images", label: "Website images", kind: "images", group: group.label }
      );
    }

    if (links.length) groups.push({ label: group.label, links });
  }

  const systemLinks: PortalNavLink[] = [];
  if (canOpenBin(access)) {
    systemLinks.push({ href: "/recycle", label: "Recycle bin", kind: "recycle", group: "System" });
  }
  systemLinks.push({ href: "/activity", label: "Audit log", kind: "audit", group: "System" });
  if (systemLinks.length) {
    groups.push({ label: "System", links: systemLinks });
  }

  return groups;
}

/** Destinations granted by access. The Dashboard link is the card page, so it is not counted. */
export function permissionNavLinks(access: PortalAccess): PortalNavLink[] {
  return portalNavGroups(access)
    .flatMap((group) => group.links)
    .filter((link) => link.kind !== "dashboard");
}

/** More than six permitted sidebar items keeps the sidebar. Six or fewer uses cards instead. */
export function usesSidebar(access: PortalAccess): boolean {
  return permissionNavLinks(access).length > SIDEBAR_ITEM_LIMIT;
}
