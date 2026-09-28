import { z } from "zod";

// Validates req.body against a zod schema and replaces it with the parsed value.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first.path.join(".");
    return res.status(400).json({
      success: false,
      message: field ? `${field}: ${first.message}` : first.message,
    });
  }
  req.body = result.data;
  next();
};

export const email = z.string().trim().toLowerCase().email("Enter a valid email");
export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(100)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");

// Multipart forms send everything as strings; this accepts "a, b, c" or an array.
export const stringList = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(/[,\n]/)).map((s) => s.trim()).filter(Boolean));
