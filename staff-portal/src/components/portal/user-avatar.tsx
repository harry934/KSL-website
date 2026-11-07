export const DEFAULT_AVATAR_SRC = "/default-avatar.webp";

/** Round profile photo, or the default silhouette when there is no photo. */
export function UserAvatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  const style = { width: size, height: size };
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url || DEFAULT_AVATAR_SRC}
      alt={url ? "" : `${name || "Staff"} profile`}
      className="user-avatar object-cover"
      style={style}
    />
  );
}
