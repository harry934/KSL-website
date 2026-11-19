import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { isImagePath, isVideoPath, safeImageUrl } from "./site-image-url.ts";

const PREV = {
  portal: process.env.NEXT_PUBLIC_PORTAL_URL,
  site: process.env.NEXT_PUBLIC_SITE_URL,
  publicOrigin: process.env.PUBLIC_SITE_ORIGIN,
  nodeEnv: process.env.NODE_ENV,
};

afterEach(() => {
  for (const [key, value] of Object.entries({
    NEXT_PUBLIC_PORTAL_URL: PREV.portal,
    NEXT_PUBLIC_SITE_URL: PREV.site,
    PUBLIC_SITE_ORIGIN: PREV.publicOrigin,
    NODE_ENV: PREV.nodeEnv,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("safeImageUrl accepts https, relative img paths, storage paths, and http portal hosts", () => {
  process.env.NEXT_PUBLIC_PORTAL_URL = "http://178.162.219.218/kwela";
  process.env.NEXT_PUBLIC_SITE_URL = "http://178.162.219.218";
  process.env.PUBLIC_SITE_ORIGIN = "http://178.162.219.218";
  process.env.NODE_ENV = "production";

  assert.equal(safeImageUrl("https://cdn.example/a.jpg"), "https://cdn.example/a.jpg");
  assert.equal(safeImageUrl("img/ksl/ferry.jpg"), "img/ksl/ferry.jpg");
  assert.equal(safeImageUrl("/img/ksl/ferry.jpg"), "img/ksl/ferry.jpg");
  assert.equal(safeImageUrl("site_settings/a.jpg"), "site_settings/a.jpg");
  assert.equal(
    safeImageUrl("http://178.162.219.218/kwela/api/stored-file?bucket=media-public&path=site_settings/a.jpg"),
    "http://178.162.219.218/kwela/api/stored-file?bucket=media-public&path=site_settings/a.jpg",
  );
  assert.equal(safeImageUrl("http://evil.example/a.jpg"), null);
  assert.equal(safeImageUrl("javascript:alert(1)"), null);
});

test("isImagePath recognizes stored-file query paths", () => {
  assert.equal(
    isImagePath("http://178.162.219.218/kwela/api/stored-file?bucket=media-public&path=site_settings/a.jpg"),
    true,
  );
  assert.equal(
    isVideoPath("http://178.162.219.218/kwela/api/stored-file?bucket=media-public&path=site_settings/a.mp4"),
    true,
  );
});
