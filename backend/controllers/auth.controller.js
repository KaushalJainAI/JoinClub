import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../model/user.model.js";
import { Otp } from "../model/otp.model.js";
import { HttpError } from "../utils/http.js";
import { uploadFile } from "../utils/cloudinary.js";
import { sendMail, otpEmail } from "../utils/mailer.js";
import { setAuthCookie, clearAuthCookie } from "../middlewares/auth.js";

const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_TYPE = "password_reset";

// The user as the frontend sees it: no secrets, and the admin's club filled in.
const publicUser = async (user) => {
  if (user.club && user.populate) await user.populate("club", "name slug shortName logo color");
  return user.toJSON ? user.toJSON() : user;
};
const firstName = (user) => (user.role === "student" ? user.fullname.split(" ")[0] : user.fullname);

// Sets a new password and invalidates every existing session (tokenVersion bump).
async function setPassword(user, newPassword) {
  user.password = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
}

// ---------- email OTP ----------

async function issueOtp(email, purpose) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await Otp.findOneAndUpdate(
    { email, purpose },
    { codeHash: await bcrypt.hash(code, 10), attempts: 0, expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000) },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await sendMail({ to: email, ...otpEmail(code, purpose, OTP_MINUTES) });
}

// Sends in the background: awaiting SMTP only for real accounts would let response
// times reveal which emails are registered.
const issueOtpInBackground = (email, purpose) => {
  issueOtp(email, purpose).catch((err) => console.error(`[otp] sending ${purpose} code to ${email} failed:`, err.message));
};

// Checks a code and consumes it on success. Wrong codes count toward the attempt limit.
async function consumeOtp(email, purpose, code) {
  const otp = await Otp.findOne({ email, purpose });
  if (!otp || otp.expiresAt < new Date()) throw new HttpError(400, "That code has expired or was already used. Request a new one.");
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await otp.deleteOne();
    throw new HttpError(429, "Too many wrong attempts. Request a new code.");
  }
  if (!(await bcrypt.compare(code, otp.codeHash))) {
    otp.attempts += 1;
    await otp.save();
    const left = OTP_MAX_ATTEMPTS - otp.attempts;
    throw new HttpError(400, left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Request a new code.");
  }
  await otp.deleteOne();
}

// ---------- register / login ----------

export const register = async (req, res) => {
  const { fullname, email, phoneNumber, password, branch, year, sid, consentAi } = req.body;
  const domain = process.env.STUDENT_EMAIL_DOMAIN;
  if (domain && !email.endsWith(`@${domain}`)) throw new HttpError(400, `Please sign up with your @${domain} email.`);
  if (await User.exists({ email })) throw new HttpError(400, "An account with this email already exists.");

  const profilePhoto = req.file ? await uploadFile(req.file, "joinclub/avatars") : "";
  const user = await User.create({
    fullname,
    email,
    phoneNumber,
    password: await bcrypt.hash(password, 10),
    role: "student",
    consentAi: Boolean(consentAi),
    consentAiAt: consentAi ? new Date() : null,
    profile: { branch, year, sid, profilePhoto },
  });
  issueOtpInBackground(email, "verify_email");
  setAuthCookie(res, user);
  res.status(201).json({
    success: true,
    message: `Welcome to JoinClub, ${firstName(user)}! We've emailed you a code to verify your address.`,
    user: await publicUser(user),
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  // Same message for unknown email and wrong password, so the form doesn't reveal which accounts exist.
  if (!user || !(await bcrypt.compare(password, user.password))) throw new HttpError(400, "Incorrect email or password.");
  // A deactivated account is kept for its history, not for signing in.
  if (user.active === false) throw new HttpError(403, "This account has been deactivated. Contact the site admin.");
  setAuthCookie(res, user);
  res.json({ success: true, message: `Welcome back, ${firstName(user)}!`, user: await publicUser(user) });
};

export const logout = async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: "Logged out." });
};

export const me = async (req, res) => {
  const user = await User.findById(req.id).populate("club", "name slug shortName logo color");
  if (!user) {
    clearAuthCookie(res);
    throw new HttpError(401, "Please log in again.");
  }
  res.json({ success: true, user: await publicUser(user) });
};

// ---------- OTP routes ----------

// Codes for change_password and verify_email always go to the logged-in user's own email.
export const requestOtp = async (req, res) => {
  const { purpose } = req.body;
  let email = req.body.email;
  if (purpose !== "reset_password") {
    if (!req.id) throw new HttpError(401, "Please log in to continue.");
    const user = await User.findById(req.id).select("email emailVerified").lean();
    if (purpose === "verify_email" && user.emailVerified) return res.json({ success: true, message: "Your email is already verified." });
    email = user.email;
  } else if (!email) {
    throw new HttpError(400, "Enter your email.");
  }
  if (await User.exists({ email })) issueOtpInBackground(email, purpose);
  // Same reply whether or not the account exists.
  res.json({ success: true, message: `If an account exists for that email, we've sent a 6-digit code. It expires in ${OTP_MINUTES} minutes.` });
};

export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;
  await consumeOtp(email, "reset_password", code);
  const user = await User.findOne({ email }).select("tokenVersion").lean();
  if (!user) throw new HttpError(400, "Account not found.");
  // Bound to the token version, so it stops working once the password changes (single use).
  const resetToken = jwt.sign({ email, typ: RESET_TOKEN_TYPE, tv: user.tokenVersion || 0 }, process.env.SECRET_KEY, { expiresIn: "10m" });
  res.json({ success: true, message: "Code verified. Choose a new password.", resetToken });
};

export const verifyEmail = async (req, res) => {
  const user = await User.findById(req.id);
  if (user.emailVerified) return res.json({ success: true, message: "Your email is already verified.", user: await publicUser(user) });
  await consumeOtp(user.email, "verify_email", req.body.code);
  user.emailVerified = true;
  await user.save();
  res.json({ success: true, message: "Email verified. You can now apply to clubs!", user: await publicUser(user) });
};

export const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.SECRET_KEY);
  } catch {
    throw new HttpError(400, "This reset link has expired. Start again.");
  }
  if (payload.typ !== RESET_TOKEN_TYPE) throw new HttpError(400, "Invalid reset token.");
  const user = await User.findOne({ email: payload.email });
  if (!user || (user.tokenVersion || 0) !== payload.tv) throw new HttpError(400, "This reset link was already used. Start again.");
  await setPassword(user, newPassword);
  // Resetting by email code also proves the address is theirs.
  if (!user.emailVerified) {
    user.emailVerified = true;
    await user.save();
  }
  setAuthCookie(res, user);
  res.json({ success: true, message: "Password updated. You're logged in.", user: await publicUser(user) });
};

// Logged-in change: prove it's you with either the current password or an emailed code.
export const changePassword = async (req, res) => {
  const { currentPassword, code, newPassword } = req.body;
  const user = await User.findById(req.id);
  if (!user) throw new HttpError(401, "Please log in again.");
  if (code) {
    await consumeOtp(user.email, "change_password", code);
  } else if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new HttpError(400, "Your current password is incorrect.");
  }
  if (await bcrypt.compare(newPassword, user.password)) throw new HttpError(400, "Pick a password you haven't used here before.");
  await setPassword(user, newPassword);
  setAuthCookie(res, user); // this session stays logged in; all others are signed out
  res.json({ success: true, message: "Password changed. Other devices have been signed out.", user: await publicUser(user) });
};
