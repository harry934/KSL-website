import { createDatabaseClient } from "@/lib/db-client";
import { dbError } from "@/lib/api-auth";
import { storedFileUrl } from "@/lib/storage";

/** Adds a portal upload to the gallery index when it is not already there (draft row for staff reference). */
export async function registerUploadedImage(
  userId: string,
  storagePath: string,
  title?: string | null,
  options?: { status?: "draft" | "published" },
) {
  const publicUrl = storedFileUrl("media-public", storagePath);
  const admin = createDatabaseClient();
  const { data: existing } = await admin
    .from("gallery_photos")
    .select("id")
    .eq("storage_path", storagePath)
    .limit(1);
  if (existing?.length) return null;

  const { data: latest } = await admin
    .from("gallery_photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const name = String(title || storagePath.split("/").pop() || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .trim()
    .slice(0, 120);
  const { error } = await admin.from("gallery_photos").insert({
    title: name || null,
    category: "all",
    storage_path: storagePath,
    public_url: publicUrl,
    sort_order: (latest?.sort_order ?? 0) + 1,
    status: options?.status ?? "draft",
    updated_by: userId,
  });
  return error ? dbError(error) : null;
}