import assert from "node:assert/strict";
import { test } from "node:test";
import { dbError, newRequestId } from "./db-errors.ts";

test("dbError maps common Postgres codes to actionable copy", () => {
  assert.match(dbError({ code: "23505", message: "duplicate key" }), /already uses/i);
  assert.match(dbError({ code: "23502", message: "null value" }), /required/i);
  assert.match(dbError({ code: "23503", message: "foreign key" }), /linked/i);
  assert.match(dbError({ code: "42P01", message: "missing" }), /migrations/i);
  assert.match(
    dbError({ message: "there is no unique or exclusion constraint matching the ON CONFLICT specification" }),
    /conflict setting/i,
  );
  assert.equal(dbError({ code: "XX000", message: "boom" }), "Something went wrong. Please try again.");
});

test("newRequestId is a short non-secret correlation token", () => {
  const id = newRequestId();
  assert.match(id, /^req_[a-z0-9]+_[a-z0-9]+$/i);
});
