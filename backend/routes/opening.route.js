import express from "express";
import { z } from "zod";
import { asyncHandler as h } from "../utils/http.js";
import { isAuthenticated, optionalAuth, requireRole } from "../middlewares/auth.js";
import { validate, stringList } from "../middlewares/validate.js";
import * as opening from "../controllers/opening.controller.js";
import { istDayEnd } from "../utils/time.js";

const router = express.Router();
const admin = [isAuthenticated, requireRole("club_admin")];

// "2026-10-15" means applications close at the end of 15 Oct in India, not 05:30 IST.
const deadlineDate = z.preprocess(istDayEnd, z.coerce.date());

const openingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  requirements: stringList.default([]),
  positions: z.coerce.number().int().min(1).max(500).default(1),
  deadline: deadlineDate.refine((d) => d > new Date(), "Deadline must be in the future"),
  mode: z.enum(["recruitment", "workshop", "event"]).default("recruitment"),
  questions: z.array(z.string().trim().min(3).max(300)).max(8).default([]),
  status: z.enum(["open", "closed"]).default("open"),
});
// No defaults here, or a partial update would reset untouched fields. Editing may
// close an opening whose deadline has passed, so the future-date check is relaxed.
const openingUpdateSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(10).max(4000).optional(),
  requirements: stringList.optional(),
  positions: z.coerce.number().int().min(1).max(500).optional(),
  deadline: deadlineDate.optional(),
  mode: z.enum(["recruitment", "workshop", "event"]).optional(),
  questions: z.array(z.string().trim().min(3).max(300)).max(8).optional(),
  status: z.enum(["open", "closed"]).optional(),
});

router.get("/", optionalAuth, h(opening.listOpenings));
router.get("/mine", ...admin, h(opening.myOpenings));
router.get("/:id", optionalAuth, h(opening.getOpening));
router.post("/", ...admin, validate(openingSchema), h(opening.createOpening));
router.put("/:id", ...admin, validate(openingUpdateSchema), h(opening.updateOpening));
router.delete("/:id", ...admin, h(opening.deleteOpening));
router.get("/:id/applicants", ...admin, h(opening.getApplicants));
router.get("/:id/applicants.csv", ...admin, h(opening.exportApplicantsCsv));

export default router;
