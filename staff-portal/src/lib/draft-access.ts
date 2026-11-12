type ReviewProfile = { is_super_admin: boolean };
type ReviewPerm = { profile_id: string; module_key: string; can_publish: boolean };

/** A draft is unpublished work from someone who cannot put that section on the website. */
export function needsPublisherReview(
  profiles: { get(id: string): ReviewProfile | undefined },
  perms: ReviewPerm[],
  userId: string | null,
  module: string
) {
  if (!userId) return false;
  const profile = profiles.get(userId);
  if (!profile || profile.is_super_admin) return false;
  return !perms.some((row) => row.profile_id === userId && row.module_key === module && row.can_publish);
}
