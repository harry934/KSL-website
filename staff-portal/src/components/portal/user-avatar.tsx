function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Round profile photo, or the person's initials when there is no photo. */
export function UserAvatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="user-avatar object-cover" style={style} />;
  }
  return (
    <span className="user-avatar" style={style} aria-hidden>
      {initials(name) || "K"}
    </span>
  );
}
