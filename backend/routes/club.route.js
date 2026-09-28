import express from "express";
import { z } from "zod";
import { asyncHandler as h } from "../utils/http.js";
import { isAuthenticated, optionalAuth, requireRole } from "../middlewares/auth.js";
import { validate, stringList } from "../middlewares/validate.js";
import { clubMediaUpload } from "../middlewares/multer.js";
import * as club from "../controllers/club.controller.js";

const router = express.Router();

// Multipart forms send nested fields as JSON strings.
const json = (schema) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }, schema);

const clubUpdateSchema = z.object({
  tagline: z.string().trim().max(120).optional(),
  pitch: z.string().trim().max(600).optional(),
  summary: z.string().trim().max(600).optional(),
  about: json(z.array(z.string().max(2000)).max(30)).optional(),
  whyJoin: json(z.array(z.object({ title: z.string().max(80), text: z.string().max(300) })).max(6)).optional(),
  activities: stringList.optional(),
  signatureEvents: json(z.array(z.object({ name: z.string().max(80), text: z.string().max(300) })).max(8)).optional(),
  skills: stringList.optional(),
  lookingFor: z.string().trim().max(300).optional(),
  commitment: z.string().trim().max(60).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  foundedYear: z.coerce.number().int().min(1900).max(2100).optional(),
  memberCount: z.coerce.number().int().min(0).max(5000).optional(),
  socials: json(
    z.object({
      instagram: z.string().max(200).optional(),
      facebook: z.string().max(200).optional(),
      youtube: z.string().max(200).optional(),
      linkedin: z.string().max(200).optional(),
      website: z.string().max(200).optional(),
      email: z.string().max(120).optional(),
    })
  ).optional(),
});

router.get("/", optionalAuth, h(club.listClubs));
router.get("/categories", h(club.categoryCounts));

// Club admin routes come before /:slug so "mine" isn't read as a slug.
router.get("/mine", isAuthenticated, requireRole("club_admin"), h(club.getMyClub));
router.get("/mine/dashboard", isAuthenticated, requireRole("club_admin"), h(club.myDashboard));
router.put("/mine", isAuthenticated, requireRole("club_admin"), ...clubMediaUpload, validate(clubUpdateSchema), h(club.updateMyClub));

router.get("/:slug", optionalAuth, h(club.getClub));
router.post("/:slug/follow", isAuthenticated, h(club.toggleFollow));

export default router;
