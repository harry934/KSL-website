import assert from "node:assert/strict";
import test from "node:test";
import { copyPlainText } from "./clipboard.ts";

test("copyPlainText returns false when no clipboard APIs exist", async () => {
  const previousNavigator = globalThis.navigator;
  const previousDocument = globalThis.document;
  // @ts-expect-error test stub
  globalThis.navigator = undefined;
  // @ts-expect-error test stub
  globalThis.document = undefined;
  try {
    assert.equal(await copyPlainText("hello"), false);
  } finally {
    // @ts-expect-error restore
    globalThis.navigator = previousNavigator;
    // @ts-expect-error restore
    globalThis.document = previousDocument;
  }
});
