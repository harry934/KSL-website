import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { appPath, currentBasePath } from "./base-path.ts";

const PREV = process.env.NEXT_PUBLIC_BASE_PATH;

afterEach(() => {
  if (PREV === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
  else process.env.NEXT_PUBLIC_BASE_PATH = PREV;
});

test("appPath prefixes NEXT_PUBLIC_BASE_PATH for API mutations", () => {
  process.env.NEXT_PUBLIC_BASE_PATH = "/kwela";
  assert.equal(currentBasePath(), "/kwela");
  assert.equal(appPath("/api/news"), "/kwela/api/news");
  assert.equal(appPath("api/staff/invites"), "/kwela/api/staff/invites");
});

test("appPath is identity when basePath is empty", () => {
  delete process.env.NEXT_PUBLIC_BASE_PATH;
  assert.equal(currentBasePath(), "");
  assert.equal(appPath("/api/news"), "/api/news");
});
