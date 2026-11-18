import assert from "node:assert/strict";
import test from "node:test";
import { openStoredUrl, signPayload } from "./stored-file.ts";

test("public payload signing never exposes private stored-file paths", async () => {
  const payload = await signPayload({
    image: "gallery/1710000000000-abcd1234.jpg",
    privateFile: "private:downloads/reports/annual.pdf",
    legacy: '<a href="https://project.supabase.co/storage/v1/object/authenticated/downloads/reports/annual.pdf">file</a>',
  });

  assert.equal(payload.privateFile, "");
  assert.equal(payload.legacy, '<a href="">file</a>');
  const image = new URL(payload.image);
  assert.equal(image.pathname, "/api/stored-file");
  assert.equal(image.searchParams.get("bucket"), "media-public");
});

test("only explicit download references receive signed links", async () => {
  const previousPortal = process.env.NEXT_PUBLIC_PORTAL_URL;
  const previousSecret = process.env.STORED_FILE_SIGNING_SECRET;
  process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.example.test";
  process.env.STORED_FILE_SIGNING_SECRET = "test-stored-file-signing-secret-at-least-32-bytes";
  try {
    const url = new URL(await openStoredUrl("private:downloads/reports/annual.pdf"));
    assert.equal(url.searchParams.get("bucket"), "downloads");
    assert.equal(url.searchParams.get("path"), "downloads/reports/annual.pdf");
    assert.ok(url.searchParams.get("signature"));
    assert.equal(await openStoredUrl("private:avatars/profile.png"), "");
  } finally {
    if (previousPortal === undefined) delete process.env.NEXT_PUBLIC_PORTAL_URL;
    else process.env.NEXT_PUBLIC_PORTAL_URL = previousPortal;
    if (previousSecret === undefined) delete process.env.STORED_FILE_SIGNING_SECRET;
    else process.env.STORED_FILE_SIGNING_SECRET = previousSecret;
  }
});
