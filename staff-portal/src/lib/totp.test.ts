import assert from "node:assert/strict";
import test from "node:test";
import {
  base32Encode,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  recoveryMatches,
  totpAt,
  verifyTotpCode,
} from "./totp.ts";

const PREV = process.env.TOTP_ENCRYPTION_SECRET;

test("TOTP codes verify within clock skew", () => {
  const secret = generateTotpSecret();
  const code = totpAt(secret);
  assert.equal(verifyTotpCode(secret, code), true);
  assert.equal(verifyTotpCode(secret, "000000"), false);
});

test("TOTP secrets round-trip through encryption", () => {
  process.env.TOTP_ENCRYPTION_SECRET = "test-totp-encryption-secret-32-bytes-min";
  try {
    const secret = generateTotpSecret();
    const enc = encryptTotpSecret(secret);
    const dec = decryptTotpSecret(enc);
    assert.equal(base32Encode(dec), base32Encode(secret));
    assert.equal(verifyTotpCode(dec, totpAt(secret)), true);
  } finally {
    if (PREV === undefined) delete process.env.TOTP_ENCRYPTION_SECRET;
    else process.env.TOTP_ENCRYPTION_SECRET = PREV;
  }
});

test("recovery codes hash and match once", () => {
  process.env.TOTP_ENCRYPTION_SECRET = "test-totp-encryption-secret-32-bytes-min";
  try {
    const [code] = generateRecoveryCodes(1);
    const hash = hashRecoveryCode(code);
    assert.equal(recoveryMatches(hash, code), true);
    assert.equal(recoveryMatches(hash, "abcd-efgh"), false);
  } finally {
    if (PREV === undefined) delete process.env.TOTP_ENCRYPTION_SECRET;
    else process.env.TOTP_ENCRYPTION_SECRET = PREV;
  }
});