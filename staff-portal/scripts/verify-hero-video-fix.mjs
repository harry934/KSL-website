/**
 * Smoke-check that the hero video fast-forward / quality regression stays fixed.
 * Run: node scripts/verify-hero-video-fix.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compressPath = path.join(root, "src/lib/compress-hero-video.ts");
const editorPath = path.join(root, "src/components/settings/site-images-editor.tsx");

const compress = await readFile(compressPath, "utf8");
const editor = await readFile(editorPath, "utf8");

const failures = [];

if (/playbackRate\s*=\s*[2-9]/.test(compress) || /playbackRate\s*=\s*1\.[1-9]/.test(compress)) {
  failures.push("compress-hero-video.ts must not set playbackRate above 1 (causes fast-forward).");
}
if (!/playbackRate\s*=\s*1\b/.test(compress)) {
  failures.push("compress-hero-video.ts should explicitly set playbackRate = 1.");
}
if (!/compress:\s*false/.test(editor)) {
  failures.push("site-images-editor.tsx should upload hero videos with compress: false.");
}
if (/compress:\s*true/.test(editor)) {
  failures.push("site-images-editor.tsx must not enable compress: true for hero uploads.");
}
if (/videoBitsPerSecond:\s*2_?500_?000/.test(compress)) {
  failures.push("Low 2.5 Mbps bitrate returned — quality target should be higher when compressing.");
}

if (failures.length) {
  console.error("Hero video fix verification FAILED:");
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}

console.info("Hero video fix verification OK:");
console.info("  - No sped-up MediaRecorder capture");
console.info("  - Hero uploads keep the original file (compress: false)");
