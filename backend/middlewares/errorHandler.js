// Central error handler: controllers throw (or call next(error)) and this sends the JSON response.
import { logger } from "../utils/logger.js";
import { captureException } from "../utils/sentry.js";

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // malformed ObjectId in a :id param
  if (err.name === "CastError") return res.status(400).json({ success: false, message: "Invalid id." });
  // unique index violation, e.g. applying twice
  if (err.code === 11000) return res.status(400).json({ success: false, message: "That already exists." });
  if (err.name === "ValidationError") {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ success: false, message: first?.message || "Invalid data." });
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ success: false, message: err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5 MB)." : err.message });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    logger.error({ err, url: req.originalUrl, requestId: req.requestId }, "unhandled error");
    captureException(err, { url: req.originalUrl, method: req.method });
  }
  const body = { success: false, message: status < 500 || err.status ? err.message : "Something went wrong." };
  if (typeof err.code === "string") body.code = err.code; // e.g. MUST_CHANGE_PASSWORD, EMAIL_NOT_VERIFIED
  return res.status(status).json(body);
};

export default errorHandler;
