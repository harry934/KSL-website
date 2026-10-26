import type { ComponentType } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  Download,
  HandHeart,
  HelpCircle,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  Mail,
  Newspaper,
  Package,
  Ship,
  Settings,
  Trash2,
  UserCog,
  Wrench,
} from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import type { PortalNavLink } from "@/lib/portal-nav";

export type IconType = ComponentType<{ className?: string }>;

export const MODULE_ICONS: Record<ModuleKey, IconType> = {
  news: Newspaper,
  events: Calendar,
  gallery: ImageIcon,
  services: Wrench,
  products: Package,
  projects: Ship,
  careers: Briefcase,
  faq: HelpCircle,
  csr: HandHeart,
  downloads: Download,
  organization: Building2,
  press: Megaphone,
  site_settings: Settings,
  messages: Mail,
  staff: UserCog,
};

export function iconForNav(link: Pick<PortalNavLink, "kind" | "module">): IconType {
  if (link.module) return MODULE_ICONS[link.module];
  if (link.kind === "banner") return Megaphone;
  if (link.kind === "images") return ImageIcon;
  if (link.kind === "recycle") return Trash2;
  if (link.kind === "audit") return History;
  return LayoutDashboard;
}
