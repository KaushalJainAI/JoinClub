import multer from "multer";
import { detectType, IMAGE_TYPES, RESUME_TYPES } from "../utils/filetypes.js";
import { HttpError } from "../utils/http.js";

const storage = multer.memoryStorage();
const limits = { fileSize: 5 * 1024 * 1024 };

// Photos, logos and covers take raster images only. SVG is excluded on purpose: it is XML
// and can carry scripts, so serving one from the site's own domain is a stored-XSS risk.
//
// This first pass only looks at the MIME type the browser claimed, to reject the obvious
// cases cheaply. It cannot be trusted: the real check is by magic bytes in checkTypes
// below, because multer calls this hook *before* the storage engine has read the bytes,
// so req.file.buffer is still empty here.
const declaredTypes = (field) => (field === "resume" ? RESUME_TYPES : IMAGE_TYPES);

const fileFilter = (req, file, cb) => {
  if (declaredTypes(file.fieldname).includes(file.mimetype)) return cb(null, true);
  const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
  err.message = file.fieldname === "resume" ? "Resume must be a PDF." : "Please upload a JPG, PNG, WebP or GIF image.";
  cb(err);
};

const upload = multer({ storage, limits, fileFilter });

// Runs after multer, when the bytes are in memory. A file that lies about its type is
// rejected here, before a controller can pass it to Cloudinary.
const checkTypes = (req, _res, next) => {
  const files = [];
  if (req.file) files.push(req.file);
  for (const list of Object.values(req.files || {})) files.push(...list);

  for (const file of files) {
    if (declaredTypes(file.fieldname).includes(detectType(file.buffer))) continue;
    const message = file.fieldname === "resume" ? "Resume must be a PDF." : "Please upload a JPG, PNG, WebP or GIF image.";
    return next(new HttpError(400, message));
  }
  next();
};

// Each export is an array: spread it after the route's other middleware.
export const singleUpload = [upload.single("file"), checkTypes];
// Profile photo and resume, or club logo and cover, in one request.
export const profileUpload = [
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  checkTypes,
];
export const clubMediaUpload = [
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  checkTypes,
];
