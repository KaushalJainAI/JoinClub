import express from "express";
import { z } from "zod";
import { asyncHandler as h } from "../utils/http.js";
import { isAuthenticated, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import * as application from "../controllers/application.controller.js";

const router = express.Router();

router.post("/opening/:id", isAuthenticated, validate(z.object({ answers: z.array(z.string().max(4000)).max(8).default([]) })), h(application.apply));
router.get("/mine", isAuthenticated, h(application.myApplications));
router.post("/:id/withdraw", isAuthenticated, h(application.withdraw));
router.patch(
  "/:id/status",
  isAuthenticated,
  requireRole("club_admin"),
  validate(application.updateStatusSchema),
  h(application.updateStatus)
);

export default router;
