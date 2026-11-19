import assert from "node:assert/strict";
import test from "node:test";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_TABLES = new Set(["faq_groups", "download_items"]);
const SLUG = /^[a-z0-9][a-z0-9_-]{0,119}$/i;

function validRecycleId(table: string, id: string) {
  if (!id) return false;
  if (SLUG_TABLES.has(table)) return SLUG.test(id);
  return UUID.test(id);
}

test("recycle accepts UUID ids for normal tables", () => {
  assert.equal(validRecycleId("news_items", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"), true);
  assert.equal(validRecycleId("gallery_photos", "not-a-uuid"), false);
});

test("recycle accepts slug ids for FAQ groups and downloads", () => {
  assert.equal(validRecycleId("faq_groups", "getting-started"), true);
  assert.equal(validRecycleId("download_items", "annual-report-2025"), true);
  assert.equal(validRecycleId("faq_groups", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"), true);
  assert.equal(validRecycleId("faq_groups", "../evil"), false);
});
