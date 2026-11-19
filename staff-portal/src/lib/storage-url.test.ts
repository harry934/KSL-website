import assert from "node:assert/strict";
import test from "node:test";

const PREV = {
  portal: process.env.NEXT_PUBLIC_PORTAL_URL,
  base: process.env.NEXT_PUBLIC_BASE_PATH,
};

test.afterEach(() => {
  if (PREV.portal === undefined) delete process.env.NEXT_PUBLIC_PORTAL_URL;
  else process.env.NEXT_PUBLIC_PORTAL_URL = PREV.portal;
  if (PREV.base === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
  else process.env.NEXT_PUBLIC_BASE_PATH = PREV.base;
});

test("storedFileUrl keeps /kwela when the portal is under a basePath", async () => {
  process.env.NEXT_PUBLIC_PORTAL_URL = "http://178.162.219.218/kwela";
  process.env.NEXT_PUBLIC_BASE_PATH = "/kwela";
  const { storedFileUrl } = await import("./storage.ts");
  const url = new URL(storedFileUrl("media-public", "organization/1710000000000-abcd1234.jpg"));
  assert.equal(url.origin, "http://178.162.219.218");
  assert.equal(url.pathname, "/kwela/api/stored-file");
  assert.equal(url.searchParams.get("bucket"), "media-public");
  assert.equal(url.searchParams.get("path"), "organization/1710000000000-abcd1234.jpg");
});

test("storedFileUrl recovers /kwela when PORTAL_URL forgot the base path", async () => {
  process.env.NEXT_PUBLIC_PORTAL_URL = "http://178.162.219.218";
  process.env.NEXT_PUBLIC_BASE_PATH = "/kwela";
  const { storedFileUrl } = await import("./storage.ts");
  const url = new URL(storedFileUrl("media-public", "site_settings/photo.jpg"));
  assert.equal(url.pathname, "/kwela/api/stored-file");
});
