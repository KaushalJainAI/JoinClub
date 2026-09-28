// Events, site stats, super-admin and AI routes.
import express from "express";
import { z } from "zod";
import { asyncHandler as h } from "../utils/http.js";
import { isAuthenticated, optionalAuth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { aiLimiter } from "../middlewares/rateLimits.js";
import { istDayEnd } from "../utils/time.js";
import * as event from "../controllers/event.controller.js";
import * as admin from "../controllers/admin.controller.js";
import * as ai from "../controllers/ai.controller.js";

export const eventRouter = express.Router();
eventRouter.get("/", h(event.listEvents));
eventRouter.post(
  "/",
  isAuthenticated,
  requireRole("club_admin"),
  validate(
    z.object({
      title: z.string().trim().min(3).max(120),
      description: z.string().trim().max(1000).default(""),
      // A date-only value from <input type="date"> means that whole day in India.
      date: z.preprocess(istDayEnd, z.coerce.date()),
      venue: z.string().trim().max(120).default("PEC Campus"),
      type: z.enum(["workshop", "competition", "performance", "talk", "social", "fest"]).default("social"),
    })
  ),
  h(event.createEvent)
);
eventRouter.delete("/:id", isAuthenticated, requireRole("club_admin"), h(event.deleteEvent));

export const statsRouter = express.Router();
statsRouter.get("/", h(admin.siteStats));

export const adminRouter = express.Router();
adminRouter.use(isAuthenticated, requireRole("super_admin"));
adminRouter.get("/clubs", h(admin.listClubAdmins));
adminRouter.post("/clubs", validate(admin.clubSchema), h(admin.createClub));
adminRouter.put("/clubs/:id", validate(admin.clubSchema.partial()), h(admin.updateClub));
adminRouter.post("/clubs/:id/archive", h(admin.archiveClub));
adminRouter.get("/users", h(admin.listUsers));
adminRouter.post("/admins", validate(admin.inviteAdminSchema), h(admin.inviteAdmin));
adminRouter.post("/admins/:userId/reassign", validate(z.object({ club: z.string().trim().nullable() })), h(admin.reassignAdmin));
adminRouter.post("/admins/:userId/active", validate(z.object({ active: z.boolean() })), h(admin.setAdminActive));
adminRouter.post("/admins/:userId/reset-password", h(admin.resetClubAdminPassword));
adminRouter.get("/ai-usage", h(admin.aiUsageReport));

export const aiRouter = express.Router();
aiRouter.get("/status", h(ai.aiStatus));
aiRouter.get("/sessions", isAuthenticated, h(ai.listSessions));
aiRouter.get("/sessions/:id", isAuthenticated, h(ai.getSession));
aiRouter.delete("/sessions/:id", isAuthenticated, h(ai.deleteSession));
aiRouter.post("/chat", optionalAuth, aiLimiter, h(ai.chat));
aiRouter.post("/check-answer", optionalAuth, aiLimiter, validate(ai.checkAnswerSchema), h(ai.checkAnswer));
aiRouter.post("/applicant-summary/:id", isAuthenticated, requireRole("club_admin"), aiLimiter, h(ai.applicantSummary));
