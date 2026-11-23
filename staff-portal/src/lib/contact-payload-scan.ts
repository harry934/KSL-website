import { gunzipSync } from "node:zlib";

const MAX_VARIANTS = 24;
const MAX_DECODE_BYTES = 12_000;
const MAX_GZIP_OUT = 24_000;

export type PayloadScan = {
  blocked: boolean;
  encodings: string[];
};

function htmlDecode(text: string) {
  return text
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/&#x0*([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#0*([0-9]+);?/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/%3c/gi, "<")
    .replace(/%3e/gi, ">")
    .replace(/%26/gi, "&");
}

function urlDecode(text: string) {
  if (!/%[0-9a-f]{2}/i.test(text)) return null;
  try {
    return decodeURIComponent(text.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

function printableRatio(buf: Buffer) {
  if (!buf.length) return 0;
  let ok = 0;
  for (const byte of buf) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte < 127)) ok++;
    else if (byte >= 0xc2) ok++; // likely UTF-8 lead — rough allowance
  }
  return ok / buf.length;
}

function fromBase64(text: string): string | null {
  const compact = text.replace(/\s+/g, "");
  if (compact.length < 12 || compact.length % 4 === 1) return null;
  if (!/^[A-Za-z0-9+/]+=*$/.test(compact)) return null;
  try {
    const buf = Buffer.from(compact, "base64");
    if (buf.length < 4 || buf.length > MAX_DECODE_BYTES) return null;
    if (printableRatio(buf) < 0.7) return null;
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function embeddedBase64(text: string): string[] {
  const out: string[] = [];
  const re = /(?:[A-Za-z0-9+/]{20,}={0,2})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const decoded = fromBase64(match[0]);
    if (decoded && decoded !== match[0]) out.push(decoded);
  }
  return out;
}

function fromHex(text: string): string | null {
  const stripped = text.replace(/^0x/i, "").replace(/\s+/g, "");
  if (stripped.length < 8 || stripped.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/i.test(stripped)) return null;
  try {
    const buf = Buffer.from(stripped, "hex");
    if (buf.length > MAX_DECODE_BYTES || printableRatio(buf) < 0.7) return null;
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function fromSlashX(text: string): string | null {
  if (!/\\x[0-9a-f]{2}/i.test(text)) return null;
  try {
    const replaced = text.replace(/\\x([0-9a-f]{2})/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
    return replaced !== text ? replaced : null;
  } catch {
    return null;
  }
}

function fromSlashOctal(text: string): string | null {
  if (!/\\[0-7]{3}/.test(text)) return null;
  const replaced = text.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
  return replaced !== text ? replaced : null;
}

function fromBinaryWords(text: string): string | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 4 || parts.some((p) => !/^[01]{8}$/.test(p))) return null;
  try {
    const chars = parts.map((p) => String.fromCharCode(parseInt(p, 2)));
    const joined = chars.join("");
    return joined.length <= MAX_DECODE_BYTES ? joined : null;
  } catch {
    return null;
  }
}

function fromGzipBase64(text: string): string | null {
  const compact = text.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(compact) || compact.length < 24) return null;
  try {
    const buf = Buffer.from(compact, "base64");
    if (buf.length < 10 || buf[0] !== 0x1f || buf[1] !== 0x8b) return null;
    const out = gunzipSync(buf, { maxOutputLength: MAX_GZIP_OUT });
    if (printableRatio(out) < 0.65) return null;
    return out.toString("utf8");
  } catch {
    return null;
  }
}

function variantsFor(text: string): { next: string[]; tags: string[] } {
  const next: string[] = [];
  const tags: string[] = [];

  const html = htmlDecode(text);
  if (html !== text) {
    next.push(html);
    tags.push("html");
  }

  const url = urlDecode(text);
  if (url && url !== text) {
    next.push(url);
    tags.push("url");
  }

  const b64 = fromBase64(text);
  if (b64) {
    next.push(b64);
    tags.push("base64");
  }
  for (const piece of embeddedBase64(text)) {
    next.push(piece);
    tags.push("base64_embedded");
  }

  const gzip = fromGzipBase64(text);
  if (gzip) {
    next.push(gzip);
    tags.push("gzip");
  }

  const hex = fromHex(text);
  if (hex) {
    next.push(hex);
    tags.push("hex");
  }

  const slashX = fromSlashX(text);
  if (slashX) {
    next.push(slashX);
    tags.push("hex_escape");
  }

  const octal = fromSlashOctal(text);
  if (octal) {
    next.push(octal);
    tags.push("octal");
  }

  const binary = fromBinaryWords(text);
  if (binary) {
    next.push(binary);
    tags.push("binary");
  }

  return { next, tags };
}

/** Decode common obfuscation layers and block if any layer breaks the field whitelist. */
export function scanContactPayload(value: string, allowed: (text: string) => boolean): PayloadScan {
  const encodings = new Set<string>();
  const queue: string[] = [value];
  const seen = new Set<string>();
  let steps = 0;

  while (queue.length && steps < MAX_VARIANTS) {
    const current = queue.shift()!;
    steps++;
    if (seen.has(current)) continue;
    seen.add(current);

    if (!allowed(current)) {
      return { blocked: true, encodings: [...encodings] };
    }

    const { next, tags } = variantsFor(current);
    tags.forEach((t) => encodings.add(t));
    for (const item of next) {
      if (!seen.has(item) && item.length <= 8000) queue.push(item);
    }
  }

  return { blocked: false, encodings: [...encodings] };
}

export type ContactFieldScan = { value: string; allowed: (text: string) => boolean };

export function scanContactFields(fields: ContactFieldScan[]): PayloadScan {
  const encodings = new Set<string>();
  for (const field of fields) {
    if (!field.value) continue;
    const scan = scanContactPayload(field.value, field.allowed);
    scan.encodings.forEach((e) => encodings.add(e));
    if (scan.blocked) return { blocked: true, encodings: [...encodings] };
  }
  return { blocked: false, encodings: [...encodings] };
}
