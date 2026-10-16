import type { ComponentType } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  Download,
  HandHeart,
  HelpCircle,
  Image as ImageIcon,
  Megaphone,
  Mail,
  Newspaper,
  Package,
  Settings,
  UserCog,
  Wrench,
} from "lucide-react";
import type { ModuleKey } from "@/lib/modules";

export type IconType = ComponentType<{ className?: string }>;

export const MODULE_ICONS: Record<ModuleKey, IconType> = {
  news: Newspaper,
  events: Calendar,
  gallery: ImageIcon,
  services: Wrench,
  products: Package,
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
