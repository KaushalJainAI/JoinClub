// File type detection by magic bytes.
//
// The browser-supplied MIME type is a claim, not evidence: a request can say image/jpeg
// and carry an SVG with a script in it, or an HTML file. Uploads are checked against the
// real leading bytes before anything is stored or sent to Cloudinary.

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const RESUME_TYPES = ["application/pdf"];

const SIGNATURES = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/gif",
    test: (b) => b.length > 6 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString("latin1")),
  },
  { mime: "application/pdf", test: (b) => b.length > 5 && b.subarray(0, 5).toString("latin1") === "%PDF-" },
  {
    // "RIFF" .... "WEBP"
    mime: "image/webp",
    test: (b) => b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/** The real type of a buffer from its magic bytes, or null if it is not a format we accept. */
export function detectType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  return SIGNATURES.find((s) => s.test(buffer))?.mime || null;
}

export const isPdf = (file) => RESUME_TYPES.includes(detectType(file?.buffer));
export const isImage = (file) => IMAGE_TYPES.includes(detectType(file?.buffer));
