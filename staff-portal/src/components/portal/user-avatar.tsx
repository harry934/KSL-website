"use client";

import { useState } from "react";
import { appPath } from "@/lib/base-path";

export const DEFAULT_AVATAR_SRC = appPath("/default-avatar.webp");

/** Round profile photo, or the default silhouette when there is no photo. */
export function UserAvatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  const src = !failed && url ? url : DEFAULT_AVATAR_SRC;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={url && !failed ? "" : `${name || "Staff"} profile`}
      className="user-avatar object-cover"
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
