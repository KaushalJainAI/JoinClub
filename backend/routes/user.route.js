import express from "express";
import { z } from "zod";
import { asyncHandler as h } from "../utils/http.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { validate, email, stringList } from "../middlewares/validate.js";
import { profileUpload } from "../middlewares/multer.js";
import { updateProfile, exportMyData, deleteMyAccount } from "../controllers/user.controller.js";

const router = express.Router();

const profileSchema = z.object({
  fullname: z.string().trim().min(2).max(80).optional(),
  email: email.optional(),
  phoneNumber: z.string().trim().max(15).optional(),
  bio: z.string().trim().max(500).optional(),
  skills: stringList.optional(),
  interests: stringList.optional(),
  branch: z.string().trim().max(60).optional(),
  year: z.coerce.number().int().min(1).max(5).optional(),
  sid: z.string().trim().max(12).optional(),
  consentAi: z.boolean().optional(),
  aiApplicantSummary: z.boolean().optional(),
});

router.put("/profile", isAuthenticated, ...profileUpload, validate(profileSchema), h(updateProfile));

// Privacy: read it all, or erase it.
router.get("/me/export", isAuthenticated, h(exportMyData));
router.delete("/me", isAuthenticated, h(deleteMyAccount));

export default router;
