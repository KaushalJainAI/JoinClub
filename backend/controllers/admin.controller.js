import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";
import { Club } from "../model/club.model.js";
import { User, BRANCHES } from "../model/user.model.js";
import { Opening } from "../model/opening.model.js";
import { Application } from "../model/application.model.js";
import { Event } from "../model/event.model.js";
import { Otp } from "../model/otp.model.js";
import { AiUsage } from "../model/aiUsage.model.js";
import { HttpError } from "../utils/http.js";
import { memo } from "../utils/memo.js";
import { generatePassword } from "../utils/password.js";
import { syncClubAdmins, setUserClub, setUserActive } from "../utils/admins.js";
import { sendMail, otpEmail } from "../utils/mailer.js";

const TZ = "Asia/Kolkata";
const OTP_MINUTES = 30;

// Public numbers for the home page.
export const siteStats = async (req, res) => {
  // The same five numbers for every visitor, so they are counted once a minute.
  const stats = await memo("stats:site", 60_000, async () => {
    const [clubs, openings, students, applications, events] = await Promise.all([
      Club.countDocuments(),
      Opening.countDocuments({ status: "open", deadline: { $gt: new Date() } }),
      User.countDocuments({ role: "student" }),
      Application.estimatedDocumentCount(),
      Event.countDocuments({ date: { $gte: new Date() } }),
    ]);
    return { clubs, openings, students, applications, events };
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ success: true, stats });
};

export const listClubAdmins = async (req, res) => {
  const clubs = await Club.find().sort({ name: 1 }).select("name shortName slug category logo color admins archivedAt").populate("admins", "fullname email mustChangePassword active updatedAt").lean();
  const appCounts = await Application.aggregate([{ $group: { _id: "$club", count: { $sum: 1 } } }]);
  const counts = Object.fromEntries(appCounts.map((r) => [String(r._id), r.count]));
  res.json({ success: true, clubs: clubs.map((c) => ({ ...c, applications: counts[String(c._id)] || 0 })) });
};

// Generates a new password for a club admin. It is returned once and never stored in plain text.
export const resetClubAdminPassword = async (req, res) => {
  const admin = await User.findOne({ _id: req.params.userId, role: "club_admin" });
  if (!admin) throw new HttpError(404, "Club admin not found.");
  const password = generatePassword();
  admin.password = await bcrypt.hash(password, 10);
  admin.mustChangePassword = true;
  await admin.save();
  res.json({ success: true, message: `New temporary password for ${admin.email}. Share it privately; they'll set their own on next login.`, email: admin.email, password });
};

// Today's tokens per feature, for the super-admin screen. cacheRead is kept separate
// because a non-zero value is the proof that prompt caching is working.
export const aiUsageReport = async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  const since = new Date(Date.now() - days * 86400_000);

  const byFeature = await AiUsage.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: "$feature",
        calls: { $sum: 1 },
        inputTokens: { $sum: "$inputTokens" },
        outputTokens: { $sum: "$outputTokens" },
        cacheReadTokens: { $sum: "$cacheReadTokens" },
        cacheWriteTokens: { $sum: "$cacheWriteTokens" },
        avgDurationMs: { $avg: "$durationMs" },
      },
    },
    { $sort: { inputTokens: -1 } },
  ]);

  const byDay = await AiUsage.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
        calls: { $sum: 1 },
        inputTokens: { $sum: "$inputTokens" },
        outputTokens: { $sum: "$outputTokens" },
        cacheReadTokens: { $sum: "$cacheReadTokens" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Heaviest users, for spotting abuse before the bill arrives.
  const topUsers = await AiUsage.aggregate([
    { $match: { createdAt: { $gte: since }, user: { $ne: null } } },
    { $group: { _id: "$user", calls: { $sum: 1 }, inputTokens: { $sum: "$inputTokens" }, outputTokens: { $sum: "$outputTokens" } } },
    { $sort: { inputTokens: -1 } },
    { $limit: 10 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user", pipeline: [{ $project: { fullname: 1, email: 1 } }] } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ]);

  const sum = (rows, key) => rows.reduce((total, r) => total + (r[key] || 0), 0);
  res.json({
    success: true,
    days,
    totals: {
      calls: sum(byFeature, "calls"),
      inputTokens: sum(byFeature, "inputTokens"),
      outputTokens: sum(byFeature, "outputTokens"),
      cacheReadTokens: sum(byFeature, "cacheReadTokens"),
      cacheWriteTokens: sum(byFeature, "cacheWriteTokens"),
    },
    byFeature: byFeature.map((r) => ({ feature: r._id, ...r, _id: undefined })),
    byDay,
    topUsers: topUsers.map((r) => ({ user: r.user, calls: r.calls, inputTokens: r.inputTokens, outputTokens: r.outputTokens })),
  });
};

// ---------- club lifecycle ----------
//
// Club leadership changes every year, so a super admin needs to hand a club from last
// year's head to this year's head without touching the database.

export const clubSchema = z.object({
  name: z.string().trim().min(2).max(120),
  shortName: z.string().trim().max(40).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens")
    .optional(),
  category: z.enum(["technical", "cultural", "literary", "social", "sports"]),
  tagline: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(600).optional(),
  about: z.array(z.string().trim().max(2000)).max(30).optional(),
  email: z.string().trim().max(120).optional(),
});

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export const createClub = async (req, res) => {
  const { slug, ...rest } = req.body;
  const finalSlug = slug || slugify(rest.name);
  if (!finalSlug) throw new HttpError(400, "Give the club a name or a slug.");
  if (await Club.exists({ slug: finalSlug })) throw new HttpError(400, "A club with that slug already exists.");
  const club = await Club.create({ ...rest, slug: finalSlug, socials: rest.email ? { email: rest.email } : {} });
  res.status(201).json({ success: true, message: `${club.name} added.`, club });
};

export const updateClub = async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) throw new HttpError(404, "Club not found.");
  // A slug is in club URLs, so it stays put once the club exists.
  const { slug, ...rest } = req.body;
  Object.assign(club, rest);
  await club.save();
  res.json({ success: true, message: "Club updated.", club });
};

// Archiving hides a club from the site but keeps its applications and history.
export const archiveClub = async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) throw new HttpError(404, "Club not found.");
  club.archivedAt = club.archivedAt ? null : new Date();
  await club.save();
  res.json({
    success: true,
    message: club.archivedAt ? `${club.name} restored.` : `${club.name} archived. Its openings are now closed.`,
    club,
  });
};

// ---------- club admin accounts ----------

export const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  fullname: z.string().trim().min(2).max(80).optional(),
  club: z.string().trim().min(1, "Pick a club").nullable().optional(),
});

// Creates the account with an unusable random password and emails a set-password code, so
// the address has to be real and no plain-text password is ever emailed or stored.
export const inviteAdmin = async (req, res) => {
  const { email, fullname, club } = req.body;
  if (await User.exists({ email })) throw new HttpError(400, "An account with that email already exists.");

  let clubId = null;
  if (club) {
    const found = await Club.findOne({ $or: [{ slug: club.toLowerCase() }, { name: club }] }).select("_id name").lean();
    if (!found) throw new HttpError(400, "That club doesn't exist. Create it first.");
    clubId = found._id;
  }

  const user = await User.create({
    fullname: fullname || email.split("@")[0].replace(/[._]/g, " "),
    email,
    // Unusable until the emailed code sets a real one.
    password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
    role: "club_admin",
    club: clubId,
    mustChangePassword: true,
    emailVerified: true,
  });
  await syncClubAdmins([clubId]);

  // Sent in the background: the response must not wait on SMTP.
  issueSetPasswordCode(email).catch((err) => console.error(`[admin] invite mail to ${email} failed:`, err.message));

  res.status(201).json({
    success: true,
    message: `${user.email} can now sign in. We emailed them a code to set a password.`,
    user: { id: user._id, email: user.email, role: user.role, club: clubId },
  });
};

async function issueSetPasswordCode(email) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await Otp.findOneAndUpdate(
    { email, purpose: "change_password" },
    { codeHash: await bcrypt.hash(code, 10), attempts: 0, expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000) },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await sendMail({ to: email, ...otpEmail(code, "change_password", OTP_MINUTES) });
}

// The yearly handover: point an account at a different club (or none).
export const reassignAdmin = async (req, res) => {
  const admin = await User.findById(req.params.userId);
  if (!admin) throw new HttpError(404, "User not found.");
  if (admin.role === "super_admin") throw new HttpError(400, "Super admins are not tied to a club.");

  let clubId = null;
  if (req.body.club) {
    const found = await Club.findOne({ $or: [{ slug: req.body.club.toLowerCase() }, { name: req.body.club }] }).select("_id").lean();
    if (!found) throw new HttpError(400, "That club doesn't exist.");
    clubId = found._id;
  }
  await setUserClub(admin, clubId);
  res.json({
    success: true,
    message: clubId ? `${admin.email} now administers that club. Their other sessions were signed out.` : `${admin.email} is no longer a club admin.`,
    user: { id: admin._id, email: admin.email, club: admin.club, active: admin.active },
  });
};

// Removes the account's admin access. Deactivating keeps the record and its history;
// deactivating is also what stops them signing in.
export const removeAdmin = async (req, res) => {
  const admin = await User.findById(req.params.userId);
  if (!admin) throw new HttpError(404, "User not found.");
  if (admin.role === "super_admin") throw new HttpError(400, "Super admins can't be removed this way.");
  await setUserActive(admin, false);
  res.json({ success: true, message: `${admin.email} can no longer sign in. Their applications were kept.`, user: { id: admin._id, active: false } });
};

export const setAdminActive = async (req, res) => {
  const admin = await User.findById(req.params.userId);
  if (!admin) throw new HttpError(404, "User not found.");
  if (admin.role === "super_admin" && req.body.active === false) throw new HttpError(400, "You can't deactivate your own super admin account.");
  await setUserActive(admin, Boolean(req.body.active));
  res.json({ success: true, message: req.body.active ? "Account reactivated." : "Account deactivated.", user: { id: admin._id, active: Boolean(req.body.active) } });
};

// Every account, for the super-admin screen.
export const listUsers = async (req, res) => {
  const { role, q, active } = req.query;
  const filter = {};
  if (role && role !== "all") filter.role = role;
  if (active === "true" || active === "false") filter.active = active === "true";
  if (q) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullname: rx }, { email: rx }];
  }
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .select("fullname email role club active mustChangePassword emailVerified createdAt lastSeenAt")
    .populate("club", "name slug")
    .lean();
  res.json({ success: true, users, branches: BRANCHES });
};
