import assert from "node:assert/strict";
import test from "node:test";
import { configuredPortalOrigin, publicPortalUrl } from "./public-url.ts";

const PREV = {
  portal: process.env.NEXT_PUBLIC_PORTAL_URL,
  base: process.env.NEXT_PUBLIC_BASE_PATH,
};

function restore() {
  if (PREV.portal === undefined) delete process.env.NEXT_PUBLIC_PORTAL_URL;
  else process.env.NEXT_PUBLIC_PORTAL_URL = PREV.portal;
  if (PREV.base === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
  else process.env.NEXT_PUBLIC_BASE_PATH = PREV.base;
}

test("publicPortalUrl prefers NEXT_PUBLIC_PORTAL_URL over localhost nextUrl", () => {
  process.env.NEXT_PUBLIC_PORTAL_URL = "http://178.162.219.218/kwela";
  assert.equal(publicPortalUrl("/login"), "http://178.162.219.218/kwela/login");
  assert.equal(configuredPortalOrigin(), "http://178.162.219.218");
  restore();
});

test("publicPortalUrl falls back to forwarded host when env is empty", () => {
  delete process.env.NEXT_PUBLIC_PORTAL_URL;
  process.env.NEXT_PUBLIC_BASE_PATH = "/kwela";
  const request = {
    headers: {
      get: (name: string) => {
        if (name === "x-forwarded-host") return "178.162.219.218";
        if (name === "x-forwarded-proto") return "http";
        return null;
      },
    },
    nextUrl: { host: "localhost:3000", protocol: "http:" },
  } as never;
  assert.equal(publicPortalUrl("/login", request), "http://178.162.219.218/kwela/login");
  restore();
});
