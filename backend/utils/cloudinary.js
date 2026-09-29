import { v2 as cloudinary } from "cloudinary";
import { isPdf } from "./filetypes.js";
import { HttpError } from "./http.js";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const configured = () => Boolean(process.env.CLOUD_NAME && process.env.API_KEY && process.env.API_SECRET);

// The longest side an uploaded image is kept at. Logos and avatars are shown at 40 to 200
// px and covers at about 1200, so a 5 MB phone photo would otherwise be stored and
// delivered at full size.
export const MAX_IMAGE_SIDE = 1600;

// The resource type is not left on "auto": a PDF must be stored as "raw" (Cloudinary would
// otherwise try to treat it as an image), and images as "image", so nothing that the upload
// type check did not allow can be served as an image. Images are also shrunk on the way in
// ("limit" only ever scales down, never up).
export const uploadOptions = (file, folder) =>
  isPdf(file)
    ? { folder, resource_type: "raw" }
    : { folder, resource_type: "image", transformation: [{ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, crop: "limit" }] };

// Uploads a multer memory file and returns its public URL. The buffer is streamed to
// Cloudinary as it is: no base64 copy of it in memory (which was a third bigger than the
// file), and no separate encoding dependency.
export async function uploadFile(file, folder = "joinclub") {
  if (!file) return null;
  if (!configured()) throw new HttpError(503, "File uploads aren't configured on this server (Cloudinary keys missing).");
  const res = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(uploadOptions(file, folder), (err, result) => (err ? reject(err) : resolve(result))).end(file.buffer);
  });
  return res.secure_url;
}

/**
 * Copies an image that lives somewhere else (a hotlinked pec.ac.in file) into Cloudinary
 * and returns the new URL. Used at seed time so a club's logo survives PEC renaming or
 * blocking hotlinks. Returns the original URL if anything goes wrong, because a missing
 * logo must not stop a seed.
 */
export async function mirrorImage(url, folder = "joinclub/seed") {
  if (!url || !configured() || url.startsWith("https://res.cloudinary.com") || url.includes("dicebear.com")) return url;
  try {
    const res = await cloudinary.uploader.fetch(url, { folder, resource_type: "image" });
    return res?.secure_url || url;
  } catch (err) {
    console.warn(`[cloudinary] could not mirror ${url}: ${err.message}`);
    return url;
  }
}

export default cloudinary;
