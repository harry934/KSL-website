import assert from "node:assert/strict";
import test from "node:test";
import { storageObjectFrom } from "./storage-path.ts";

test("storage paths point at the bucket that holds the file", () => {
  assert.deepEqual(storageObjectFrom("gallery/1710000000000-abcd1234.jpg"), {
    bucket: "media-public",
    path: "gallery/1710000000000-abcd1234.jpg",
  });
  assert.deepEqual(storageObjectFrom("private:downloads/1710000000000-abcd1234.pdf"), {
    bucket: "downloads",
    path: "downloads/1710000000000-abcd1234.pdf",
  });
  assert.deepEqual(
    storageObjectFrom(
      "https://example.supabase.co/storage/v1/object/public/media-public/site_settings/1710000000000-abcd1234.mp4"
    ),
    { bucket: "media-public", path: "site_settings/1710000000000-abcd1234.mp4" }
  );
  assert.equal(storageObjectFrom("img/ksl/mombasa.webp"), null);
  assert.equal(storageObjectFrom("https://kenyashipyards.co.ke/img/ksl/mombasa.webp"), null);
  assert.equal(storageObjectFrom("../secrets.pdf"), null);
});
