import express from "express";
import { z } from "zod";
import { asyncHandler as h } from "../utils/http.js";
import { isAuthenticated, optionalAuth } from "../middlewares/auth.js";
import { validate, email, password } from "../middlewares/validate.js";
import { singleUpload } from "../middlewares/multer.js";
import { authLimiter, otpByEmail, otpByIp } from "../middlewares/rateLimits.js";
import { OTP_PURPOSES } from "../model/otp.model.js";
import * as auth from "../controllers/auth.controller.js";

const router = express.Router();
const code = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

const registerSchema = z.object({
  fullname: z.string().trim().min(2, "Enter your full name").max(80),
  email,
  phoneNumber: z.string().trim().regex(/^[0-9+\- ]{7,15}$/, "Enter a valid phone number").optional().or(z.literal("")),
  password,
  branch: z.string().trim().max(60).optional(),
  year: z.coerce.number().int().min(1).max(5).optional(),
  sid: z.string().trim().max(12).optional(),
  // Consent to sending this student's profile and answers to Anthropic for the AI
  // features. Optional here, and the AI features check it, so declining still allows an
  // account; see the privacy notice.
  consentAi: z.boolean().optional(),
});

router.post("/register", authLimiter, ...singleUpload, validate(registerSchema), h(auth.register));
router.post("/login", authLimiter, validate(z.object({ email, password: z.string().min(1, "Enter your password") })), h(auth.login));
router.post("/logout", h(auth.logout));
router.get("/me", isAuthenticated, h(auth.me));

router.post(
  "/otp/request",
  otpByIp,
  optionalAuth,
  validate(z.object({ email: email.optional(), purpose: z.enum(OTP_PURPOSES) })),
  otpByEmail,
  h(auth.requestOtp)
);
router.post("/otp/verify", authLimiter, validate(z.object({ email, code })), h(auth.verifyOtp));
router.post("/email/verify", isAuthenticated, authLimiter, validate(z.object({ code })), h(auth.verifyEmail));
router.post("/password/reset", authLimiter, validate(z.object({ resetToken: z.string().min(10), newPassword: password })), h(auth.resetPassword));
router.post(
  "/password/change",
  isAuthenticated,
  authLimiter,
  validate(z.object({ newPassword: password, currentPassword: z.string().optional(), code: code.optional() })),
  h(auth.changePassword)
);

export default router;
