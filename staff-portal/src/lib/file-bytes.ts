const SIGNATURES: Record<string, number[][]> = {
  jpg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47]],
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  doc: [[0xd0, 0xcf, 0x11, 0xe0]],
  docx: [[0x50, 0x4b, 0x03, 0x04]],
};

function matches(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function hasFtyp(bytes: Uint8Array) {
  const end = Math.min(bytes.length - 3, 256);
  for (let i = 0; i < end; i++) {
    if (bytes[i] === 0x66 && bytes[i + 1] === 0x74 && bytes[i + 2] === 0x79 && bytes[i + 3] === 0x70) return true;
  }
  return false;
}

/** True when an MP4 header uses a codec the public site cannot play. */
export function mp4IsHevc(bytes: Uint8Array) {
  let text = "";
  const end = Math.min(bytes.length, 256);
  for (let i = 0; i < end; i++) {
    const value = bytes[i];
    text += value >= 32 && value < 127 ? String.fromCharCode(value) : " ";
  }
  return text.includes("hev1") || text.includes("hvc1");
}

/** Checks the start of the file, not the browser-supplied Content-Type. */
export function matchesDeclaredType(bytes: Uint8Array, ext: string) {
  if (ext === "mp4") return hasFtyp(bytes);
  if (ext === "webm") {
    return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  if (ext === "webp") {
    return (
      bytes.length >= 12 &&
      matches(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  const signatures = SIGNATURES[ext];
  return Boolean(signatures?.some((signature) => matches(bytes, signature)));
}
