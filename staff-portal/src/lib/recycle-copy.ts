/** Confirm copy when moving a live item into the recycle bin (not a permanent delete). */
export function moveToBinConfirm(name?: string) {
  const label = name?.trim();
  return {
    title: label ? `Move “${label}” to the recycle bin?` : "Move to the recycle bin?",
    message: "It leaves the live site. You can restore it or delete it for good from the recycle bin.",
    confirmLabel: "Move to bin",
  };
}
