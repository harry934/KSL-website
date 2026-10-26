"use client";

import Link from "next/link";
import { iconForNav } from "@/components/portal/module-icons";
import { useNoticeBadges } from "@/components/portal/use-notice-badges";
import type { PortalNavLink } from "@/lib/portal-nav";

function noteFor(link: PortalNavLink) {
  if (link.kind === "banner") return "Website announcement";
  if (link.kind === "images") return "Photos on the website";
  if (link.kind === "recycle") return "Removed items";
  if (link.kind === "audit") return "Who changed what";
  return link.group ?? "";
}

export function SectionCards({ links, userId }: { links: PortalNavLink[]; userId: string }) {
  const badges = useNoticeBadges(userId);

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
          const count = link.module ? (badges[link.module] ?? 0) : 0;
          const note = noteFor(link);
          return (
            <Link key={link.href} href={link.href} className="ksl-card dash-launch">
              <span className="dash-launch-icon" aria-hidden>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="dash-launch-label">{link.label}</span>
                {note ? <span className="dash-launch-note">{note}</span> : null}
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
