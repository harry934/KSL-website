"use client";

import { useRouter } from "next/navigation";
import { NotificationCenter, type NotificationItem } from "@/components/ui/notification-center";

export function NoticeBoard({ title, items }: { title: string; items: NotificationItem[] }) {
  const router = useRouter();
  if (!items.length) return null;
  return (
    <NotificationCenter
      items={items}
      title={title}
      showFooter={false}
      showActions={false}
      className="max-w-none shadow-[0_1px_2px_rgba(11,31,58,0.04)]"
      onSelect={(item) => {
        if (item.href) router.push(item.href);
      }}
    />
  );
}
