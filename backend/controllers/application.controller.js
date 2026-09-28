import { z } from "zod";
import { Application, APPLICATION_STATUSES } from "../model/application.model.js";
import { Opening } from "../model/opening.model.js";
import { HttpError } from "../utils/http.js";
import { assertOwnsClub } from "./club.controller.js";

// "withdrawn" is deliberately absent: only the student can withdraw, through /withdraw.
const ADMIN_STATUSES = APPLICATION_STATUSES.filter((s) => s !== "withdrawn");

export const updateStatusSchema = z.object({
  status: z.enum(ADMIN_STATUSES).optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

// One entry per status change, for the timeline the student and the admin both see.
const recordHistory = (application, status, by) => {
  application.history.push({ status, by: by || null, at: new Date() });
};

export const apply = async (req, res) => {
  if (req.role !== "student") throw new HttpError(403, "Only student accounts can apply to clubs.");
  if (!req.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION !== "false") {
    const err = new HttpError(403, "Verify your email before applying. We sent a code when you signed up.");
    err.code = "EMAIL_NOT_VERIFIED";
    throw err;
  }
  const opening = await Opening.findById(req.params.id);
  if (!opening) throw new HttpError(404, "Opening not found.");
  if (opening.status !== "open" || opening.deadline <= new Date()) throw new HttpError(400, "Applications for this opening are closed.");

  const answers = opening.questions.map((question, i) => ({ question, answer: (req.body.answers?.[i] || "").trim() }));
  const missing = answers.findIndex((a) => a.answer.length < 2);
  if (missing >= 0) throw new HttpError(400, `Please answer: "${answers[missing].question}"`);

  // A student who withdrew can apply again while the opening is still open.
  const withdrawn = await Application.findOne({ opening: opening._id, applicant: req.id, status: "withdrawn" });
  if (withdrawn) {
    withdrawn.set({ answers, status: "pending" });
    recordHistory(withdrawn, "pending", req.id);
    await withdrawn.save();
    return res.status(201).json({ success: true, message: "Application sent again. Good luck 🎉", application: withdrawn });
  }

  try {
    const application = await Application.create({ opening: opening._id, club: opening.club, applicant: req.id, answers });
    recordHistory(application, "pending", req.id);
    await application.save();
    res.status(201).json({ success: true, message: "Application sent! Good luck 🎉", application });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(400, "You've already applied to this opening.");
    throw err;
  }
};

// The student sees what happened and when, but not who did it: naming the club admin
// would turn a rejected application into a way to identify individuals.
export const myApplications = async (req, res) => {
  const applications = await Application.find({ applicant: req.id })
    .sort({ createdAt: -1 })
    .populate("opening", "title deadline mode status")
    .populate("club", "name shortName slug logo color category")
    .lean();
  res.json({ success: true, applications: applications.map((a) => ({ ...a, history: (a.history || []).map(({ status, at }) => ({ status, at })) })) });
};

export const withdraw = async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, applicant: req.id });
  if (!application) throw new HttpError(404, "Application not found.");
  if (!["pending", "shortlisted"].includes(application.status)) throw new HttpError(400, "This application has already been decided.");
  application.status = "withdrawn";
  recordHistory(application, "withdrawn", req.id);
  await application.save();
  res.json({ success: true, message: "Application withdrawn.", application });
};

export const updateStatus = async (req, res) => {
  const application = await Application.findById(req.params.id).select("+adminNote");
  if (!application) throw new HttpError(404, "Application not found.");
  assertOwnsClub(req, application.club);
  if (application.status === "withdrawn") throw new HttpError(400, "The student withdrew this application.");
  const { status, adminNote } = req.body;
  if (status) {
    application.status = status;
    recordHistory(application, status, req.id);
  }
  if (adminNote !== undefined) application.adminNote = adminNote;
  await application.save();
  res.json({ success: true, message: `Marked as ${application.status}.`, application });
};
