import { z } from "zod";
import mongoose from "mongoose";
import { User } from "../model/user.model.js";
import { Application } from "../model/application.model.js";
import { ChatSession, ChatMessage, CHAT_RETENTION_DAYS } from "../model/chat.model.js";
import { Club } from "../model/club.model.js";
import { clearAuthCookie } from "../middlewares/auth.js";
import { HttpError } from "../utils/http.js";
import { uploadFile } from "../utils/cloudinary.js";

export const updateProfile = async (req, res) => {
  const user = await User.findById(req.id);
  if (!user) throw new HttpError(404, "User not found.");

  const { fullname, email, phoneNumber, bio, skills, interests, branch, year, sid, consentAi, aiApplicantSummary } = req.body;
  if (email && email !== user.email) {
    if (await User.exists({ email })) throw new HttpError(400, "That email is already in use.");
    user.email = email;
  }
  if (fullname !== undefined) user.fullname = fullname;
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
  if (bio !== undefined) user.profile.bio = bio;
  if (skills !== undefined) user.profile.skills = skills;
  if (interests !== undefined) user.profile.interests = interests;
  if (branch !== undefined) user.profile.branch = branch;
  if (year !== undefined) user.profile.year = year;
  if (sid !== undefined) user.profile.sid = sid;
  // Consent and the AI opt-out are privacy choices, so they are timestamped and revocable.
  if (consentAi !== undefined) {
    user.consentAi = Boolean(consentAi);
    user.consentAiAt = user.consentAi ? new Date() : null;
  }
  if (aiApplicantSummary !== undefined) user.aiApplicantSummary = Boolean(aiApplicantSummary);

  const photo = req.files?.file?.[0];
  const resume = req.files?.resume?.[0];
  if (photo) user.profile.profilePhoto = await uploadFile(photo, "joinclub/avatars");
  if (resume) {
    user.profile.resume = await uploadFile(resume, "joinclub/resumes");
    user.profile.resumeOriginalName = resume.originalname;
  }

  await user.save();
  res.json({ success: true, message: "Profile updated.", user: user.toJSON() });
};

// ---------- privacy: export and erase ----------

// Everything we hold about one student, as JSON, so it can be read without the UI.
export const exportMyData = async (req, res) => {
  const user = await User.findById(req.id).populate("club", "name slug").lean();
  if (!user) throw new HttpError(404, "User not found.");

  const [applications, sessions] = await Promise.all([
    Application.find({ applicant: req.id })
      .populate("opening", "title deadline mode status")
      .populate("club", "name slug")
      .lean(),
    ChatSession.find({ user: req.id }).select("title mode createdAt updatedAt meta").lean(),
  ]);
  const messages = sessions.length ? await ChatMessage.find({ session: { $in: sessions.map((s) => s._id) } }).sort({ createdAt: 1 }).lean() : [];

  const { password, tokenVersion, __v, ...safe } = user;
  res.json({
    success: true,
    exportedAt: new Date().toISOString(),
    note: "AI features send parts of this data (your profile and application answers) to Anthropic to generate suggestions. See /privacy.",
    user: safe,
    applications: applications.map((a) => ({ ...a, adminNote: undefined })),
    chats: sessions.map((s) => ({ ...s, messages: messages.filter((m) => String(m.session) === String(s._id)) })),
  });
};

/**
 * Deletes the account. Applications stay, because the club that received them has a
 * record of the recruitment: the applicant is replaced with an anonymised placeholder and
 * the answers are dropped. Chats are deleted outright.
 */
export const deleteMyAccount = async (req, res) => {
  const user = await User.findById(req.id);
  if (!user) throw new HttpError(404, "User not found.");
  if (user.role === "super_admin") throw new HttpError(400, "The super admin account can't be deleted here.");

  const applications = await Application.find({ applicant: req.id }).select("_id").lean();
  const sessionIds = await ChatSession.find({ user: req.id }).select("_id").lean();
  // A placeholder id, not null: the unique {opening, applicant} index treats every null as
  // the same value, which would block a later applicant from the same opening.
  const anonymousId = new mongoose.Types.ObjectId();

  await Promise.all([
    // Keeps the club's count and status history, drops the personal answers.
    Application.updateMany(
      { applicant: req.id },
      { $set: { answers: [], applicant: anonymousId, applicantDeleted: true, adminNote: "" } }
    ),
    Club.updateMany({ followers: req.id }, { $pull: { followers: req.id } }),
    ChatMessage.deleteMany({ session: { $in: sessionIds.map((s) => s._id) } }),
    ChatSession.deleteMany({ user: req.id }),
  ]);

  await user.deleteOne();
  clearAuthCookie(res);
  res.json({
    success: true,
    message: `Account deleted. ${applications.length} application${applications.length === 1 ? "" : "s"} were kept without your name or answers, as the clubs that received them need that record.`,
  });
};

export const privacySettingsSchema = z.object({
  consentAi: z.boolean().optional(),
  aiApplicantSummary: z.boolean().optional(),
});
