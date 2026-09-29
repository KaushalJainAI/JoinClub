import { Opening, withIsOpen } from "../model/opening.model.js";
import { Application } from "../model/application.model.js";
import { Club } from "../model/club.model.js";
import { User } from "../model/user.model.js";
import { HttpError, escapeRegex, toCsv } from "../utils/http.js";
import { searchIds } from "../utils/search.js";
import { invalidateMemo } from "../utils/memo.js";
import { assertOwnsClub } from "./club.controller.js";

// The assistant's "open openings" digest and the home stats both change with these.
const openingsChanged = () => invalidateMemo("openings:");

const CLUB_CARD = "name shortName slug logo color category";

async function countApplicants(openingIds) {
  const rows = await Application.aggregate([
    { $match: { opening: { $in: openingIds } } },
    { $group: { _id: "$opening", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}

// ?page=&limit= with a default and a ceiling, so a list request can't pull everything.
const pageParams = (query, { defaultLimit, maxLimit }) => {
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  const page = Math.max(1, Number(query.page) || 1);
  return { limit, page, skip: (page - 1) * limit };
};

export const listOpenings = async (req, res) => {
  const { q, category, club, mode, includeClosed } = req.query;
  const filter = includeClosed === "true" ? {} : { status: "open", deadline: { $gt: new Date() } };
  if (mode) filter.mode = mode;
  if (club || (category && category !== "all")) {
    const clubFilter = {};
    if (club) clubFilter.slug = club;
    if (category && category !== "all") clubFilter.category = category;
    filter.club = { $in: await Club.find(clubFilter).distinct("_id") };
  }
  // Whole words through the text index, plus the start of any title word ("robo" finds
  // "Robotics recruitment"). Applied after the other filters so both queries stay narrow.
  const matches = await searchIds(Opening, filter, q, ["title"]);
  if (matches) filter._id = { $in: matches };
  const { limit, page, skip } = pageParams(req.query, { defaultLimit: 24, maxLimit: 100 });
  const [openings, total] = await Promise.all([
    Opening.find(filter).sort({ deadline: 1, _id: 1 }).skip(skip).limit(limit).populate("club", CLUB_CARD).lean(),
    Opening.countDocuments(filter),
  ]);
  const ids = openings.map((o) => o._id);
  const [counts, apps] = await Promise.all([
    countApplicants(ids),
    req.id ? Application.find({ applicant: req.id, opening: { $in: ids } }).select("opening status").lean() : [],
  ]);
  const mine = new Map(apps.map((a) => [String(a.opening), a.status]));
  res.json({
    success: true,
    openings: openings.map((o) => ({ ...withIsOpen(o), applicantCount: counts[String(o._id)] || 0, myStatus: mine.get(String(o._id)) || null })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
};

export const getOpening = async (req, res) => {
  const opening = await Opening.findById(req.params.id)
    .populate("club", `${CLUB_CARD} tagline commitment lookingFor`)
    .lean();
  if (!opening) throw new HttpError(404, "Opening not found.");
  const [applicantCount, myApplication] = await Promise.all([
    Application.countDocuments({ opening: opening._id }),
    req.id ? Application.findOne({ opening: opening._id, applicant: req.id }).lean() : null,
  ]);
  res.json({ success: true, opening: { ...withIsOpen(opening), applicantCount }, myApplication });
};

// ---------- club admin ----------

export const myOpenings = async (req, res) => {
  const openings = await Opening.find({ club: req.clubId }).sort({ createdAt: -1 }).lean();
  const rows = await Application.aggregate([
    { $match: { opening: { $in: openings.map((o) => o._id) } } },
    { $group: { _id: { opening: "$opening", status: "$status" }, count: { $sum: 1 } } },
  ]);
  const byOpening = {};
  for (const r of rows) {
    const key = String(r._id.opening);
    byOpening[key] ??= { total: 0 };
    byOpening[key][r._id.status] = r.count;
    byOpening[key].total += r.count;
  }
  res.json({
    success: true,
    openings: openings.map((o) => ({
      ...withIsOpen(o),
      counts: byOpening[String(o._id)] || { total: 0 },
    })),
  });
};

export const createOpening = async (req, res) => {
  if (!req.clubId) throw new HttpError(403, "Your account isn't linked to a club.");
  const opening = await Opening.create({ ...req.body, club: req.clubId, createdBy: req.id });
  openingsChanged();
  res.status(201).json({ success: true, message: "Opening published.", opening });
};

export const updateOpening = async (req, res) => {
  const opening = await Opening.findById(req.params.id);
  if (!opening) throw new HttpError(404, "Opening not found.");
  assertOwnsClub(req, opening.club);
  const questionsChanged = req.body.questions && JSON.stringify(req.body.questions) !== JSON.stringify(opening.questions);
  if (questionsChanged && (await Application.exists({ opening: opening._id }))) {
    throw new HttpError(400, "Students have already answered these questions, so they can't be changed. Create a new opening instead.");
  }
  Object.assign(opening, req.body);
  await opening.save();
  openingsChanged();
  res.json({ success: true, message: "Opening updated.", opening });
};

export const deleteOpening = async (req, res) => {
  const opening = await Opening.findById(req.params.id);
  if (!opening) throw new HttpError(404, "Opening not found.");
  assertOwnsClub(req, opening.club);
  if (await Application.exists({ opening: opening._id })) {
    throw new HttpError(400, "Students have already applied. Close the opening instead of deleting it.");
  }
  await opening.deleteOne();
  openingsChanged();
  res.json({ success: true, message: "Opening deleted." });
};

// The opening (after the ownership check) and the Application filter for the request's
// status tab and search box. The search runs against the users who applied, in the
// database, so only the page being shown is ever loaded.
async function applicantQuery(req) {
  const opening = await Opening.findById(req.params.id).lean();
  if (!opening) throw new HttpError(404, "Opening not found.");
  assertOwnsClub(req, opening.club);
  const filter = { opening: opening._id };
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  const q = String(req.query.q || "").trim().slice(0, 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const applicantIds = await Application.find({ opening: opening._id }).distinct("applicant");
    filter.applicant = {
      $in: await User.find({ _id: { $in: applicantIds }, $or: [{ fullname: rx }, { email: rx }, { "profile.branch": rx }, { "profile.skills": rx }] }).distinct("_id"),
    };
  }
  return { opening, filter };
}

const findApplications = (filter) =>
  Application.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .select("+adminNote")
    .populate("applicant", "fullname email phoneNumber profile")
    .populate("history.by", "fullname email");

export const getApplicants = async (req, res) => {
  const { opening, filter } = await applicantQuery(req);
  const { limit, page, skip } = pageParams(req.query, { defaultLimit: 50, maxLimit: 200 });
  const [applications, total, byStatus] = await Promise.all([
    findApplications(filter).skip(skip).limit(limit).lean(),
    Application.countDocuments(filter),
    // Counts cover every applicant of the opening, whatever the filter, for the status tabs.
    Application.aggregate([{ $match: { opening: opening._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const counts = Object.fromEntries(byStatus.map((r) => [r._id, r.n]));
  counts.all = byStatus.reduce((sum, r) => sum + r.n, 0);
  res.json({ success: true, opening, applications, total, page, pages: Math.max(1, Math.ceil(total / limit)), counts });
};

export const exportApplicantsCsv = async (req, res) => {
  const { opening, filter } = await applicantQuery(req);
  const applications = await findApplications(filter).lean(); // the export is deliberately unpaged
  const questionCols = (opening.questions || []).map((q) => ({
    label: q,
    get: (a) => a.answers?.find((x) => x.question === q)?.answer || "",
  }));
  const csv = toCsv(applications, [
    { label: "Name", get: (a) => a.applicant?.fullname },
    { label: "Email", get: (a) => a.applicant?.email },
    { label: "Phone", get: (a) => a.applicant?.phoneNumber },
    { label: "SID", get: (a) => a.applicant?.profile?.sid },
    { label: "Branch", get: (a) => a.applicant?.profile?.branch },
    { label: "Year", get: (a) => a.applicant?.profile?.year },
    { label: "Skills", get: (a) => a.applicant?.profile?.skills },
    { label: "Status", get: (a) => a.status },
    { label: "Applied on", get: (a) => new Date(a.createdAt).toISOString().slice(0, 10) },
    ...questionCols,
  ]);
  const name = opening.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="applicants-${name}.csv"`);
  res.send("﻿" + csv); // BOM so Excel reads UTF-8 names correctly
};
