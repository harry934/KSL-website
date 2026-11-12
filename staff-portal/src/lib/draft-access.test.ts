import assert from "node:assert/strict";
import test from "node:test";
import { needsPublisherReview } from "./draft-access.ts";

const profiles = new Map([
  ["super", { is_super_admin: true }],
  ["pub", { is_super_admin: false }],
  ["edit", { is_super_admin: false }],
]);

const perms = [
  { profile_id: "pub", module_key: "gallery", can_publish: true },
  { profile_id: "edit", module_key: "gallery", can_publish: false },
];

test("drafts are unpublished changes from people who cannot publish", () => {
  assert.equal(needsPublisherReview(profiles, perms, "super", "gallery"), false);
  assert.equal(needsPublisherReview(profiles, perms, "pub", "gallery"), false);
  assert.equal(needsPublisherReview(profiles, perms, "edit", "gallery"), true);
  assert.equal(needsPublisherReview(profiles, perms, null, "gallery"), false);
});
