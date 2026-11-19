/**
 * Import reviewed objects from an external directory with media-public/, downloads/,
 * and avatars/ subdirectories. Private buckets stay private because this writes only
 * filesystem objects and stored_files metadata; it never publishes URLs.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { saveStoredFile } from "@/lib/storage";
import { matchesDeclaredType } from "@/lib/file-bytes";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "../..");
const sourceRoot = process.argv[2];
const buckets = new Set(["media-public", "downloads", "avatars"]);
const extensions = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  mp4: "video/mp4", webm: "video/webm",
};
const limits = { image: 8 * 1024 * 1024, document: 25 * 1024 * 1024, video: 50 * 1024 * 1024 };

function outsideRepository(value) {
  const resolved = path.resolve(value);
  return resolved !== repositoryRoot && !resolved.startsWith(`${repositoryRoot}${path.sep}`);
}
function safeRelative(value) {
  return value && !value.includes("\\") && !value.split("/").some((part) => !part || part === "." || part === "..") && /^[A-Za-z0-9._ -]+(?:\/[A-Za-z0-9._ -]+)*$/.test(value);
}
async function filesUnder(root, relative = "") {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (!safeRelative(child)) throw new Error(`Unsafe source path: ${child}`);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${child}`);
    if (entry.isDirectory()) files.push(...await filesUnder(root, child));
    else if (entry.isFile()) files.push(child);
    else throw new Error(`Unsupported source entry: ${child}`);
  }
  return files;
}
function contentType(relative) {
  const extension = relative.split(".").pop()?.toLowerCase() ?? "";
  const type = extensions[extension];
  if (!type) throw new Error(`Unsupported imported file type: ${relative}`);
  return { extension, type, category: ["jpg", "jpeg", "png", "webp"].includes(extension) ? "image" : ["mp4", "webm"].includes(extension) ? "video" : "document" };
}

if (!sourceRoot || !path.isAbsolute(sourceRoot)) throw new Error("Usage: node scripts/import-storage-objects.mjs /absolute/path/object-export");
if (!outsideRepository(sourceRoot)) throw new Error("Storage exports must be outside the repository and deployment tree");
const imported = [];
for (const bucket of buckets) {
  const bucketRoot = path.resolve(sourceRoot, bucket);
  let files;
  try {
    files = await filesUnder(bucketRoot);
  } catch (error) {
    if (error?.code === "ENOENT") continue;
    throw error;
  }
  for (const relative of files) {
    const { extension, type, category } = contentType(relative);
    if (bucket === "avatars" && category !== "image") throw new Error(`Avatar must be an image: ${relative}`);
    const bytes = await readFile(path.join(bucketRoot, relative));
    if (bytes.byteLength > limits[category]) throw new Error(`Imported ${relative} exceeds the ${category} size limit`);
    if (!matchesDeclaredType(bytes, extension === "jpeg" ? "jpg" : extension)) {
      throw new Error(`Imported ${relative} does not match its file signature`);
    }
    await saveStoredFile(bucket, relative, bytes, type);
    imported.push(`${bucket}/${relative}`);
  }
}
console.info(`Storage import completed (${imported.length} objects).`);
