import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

test("clipboard helpers export copyPlainText and copyHtmlAndPlain", () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(dir, "clipboard.ts"), "utf8");
  assert.match(source, /export async function copyPlainText/);
  assert.match(source, /export async function copyHtmlAndPlain/);
  assert.match(source, /document\.execCommand\("copy"\)/);
});
