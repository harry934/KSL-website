"use client";

import Link from "next/link";
import { iconForNav } from "@/components/portal/module-icons";
import { useDraftCount } from "@/components/portal/drafts-page";
import { useNoticeBadges } from "@/components/portal/use-notice-badges";
import type { PortalNavLink } from "@/lib/portal-nav";

function noteFor(link: PortalNavLink) {
  if (link.kind === "banner") return "Website announcement";
  if (link.kind === "board") return "Directors on the KSL Board page";
  if (link.kind === "images") return "Photos on the website";
  if (link.kind === "drafts") return "Saved by staff who cannot publish";
  if (link.kind === "recycle") return "Removed items";
  if (link.kind === "audit") return "Who changed what";
  return link.group ?? "";
}

export function SectionCards({ links, userId }: { links: PortalNavLink[]; userId: string }) {
  const badges = useNoticeBadges(userId);
  const draftCount = useDraftCount(links.some((link) => link.kind === "drafts"));

  if (!links.length) {
    return (
      <p className="ksl-card px-5 py-8 text-center text-[14px] text-[#6b7785]">
        No sections are assigned to this account yet.
      </p>
    );
  }

  return (
    <section aria-label="Your sections">
      <h2 className="mb-2.5 text-[13px] font-semibold text-[#5b6775]">Your sections</h2>
      <div className="dash-launch-grid">
        {links.map((link) => {
          const Icon = iconForNav(link);
          const count = link.kind === "recycle" ? badges.recycle : link.kind === "drafts" ? draftCount : 0;
          const note = noteFor(link);
          return (
            <Link key={link.href} href={link.href} className="ksl-card dash-section">
              <Icon className="h-4 w-4 shrink-0 text-[#5b6775]" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#0b1f3a]">{link.label}</span>
                {note ? <span className="mt-0.5 block text-[12.5px] text-[#6b7785]">{note}</span> : null}
              </span>
              {count > 0 ? (
                <span className="nav-badge" aria-label={`${count} unread`}>
                  {count > 9 ? "9+" : count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
