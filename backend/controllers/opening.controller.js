import { Opening, withIsOpen } from "../model/opening.model.js";
import { Application } from "../model/application.model.js";
import { Club } from "../model/club.model.js";
import { HttpError, escapeRegex, toCsv } from "../utils/http.js";
import { assertOwnsClub } from "./club.controller.js";

const CLUB_CARD = "name shortName slug logo color category";

async function countApplicants(openingIds) {
  const rows = await Application.aggregate([
    { $match: { opening: { $in: openingIds } } },
    { $group: { _id: "$opening", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}

export const listOpenings = async (req, res) => {
  const { q, category, club, mode, includeClosed } = req.query;
  const filter = includeClosed === "true" ? {} : { status: "open", deadline: { $gt: new Date() } };
  if (mode) filter.mode = mode;
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ title: rx }, { description: rx }, { requirements: rx }];
  }
  if (club || (category && category !== "all")) {
    const clubFilter = {};
    if (club) clubFilter.slug = club;
    if (category && category !== "all") clubFilter.category = category;
    filter.club = { $in: await Club.find(clubFilter).distinct("_id") };
  }
  const openings = await Opening.find(filter).sort({ deadline: 1 }).limit(100).populate("club", CLUB_CARD).lean();
  const counts = await countApplicants(openings.map((o) => o._id));
  let mine = new Map();
  if (req.id) {
    const apps = await Application.find({ applicant: req.id, opening: { $in: openings.map((o) => o._id) } }).select("opening status").lean();
    mine = new Map(apps.map((a) => [String(a.opening), a.status]));
  }
  res.json({
    success: true,
    openings: openings.map((o) => ({ ...withIsOpen(o), applicantCount: counts[String(o._id)] || 0, myStatus: mine.get(String(o._id)) || null })),
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
  res.json({ success: true, message: "Opening deleted." });
};

async function loadApplicants(req) {
  const opening = await Opening.findById(req.params.id).lean();
  if (!opening) throw new HttpError(404, "Opening not found.");
  assertOwnsClub(req, opening.club);
  const filter = { opening: opening._id };
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  const applications = await Application.find(filter)
    .sort({ createdAt: -1 })
    .select("+adminNote")
    .populate("applicant", "fullname email phoneNumber profile")
    .lean();
  const q = req.query.q?.trim().toLowerCase();
  const filtered = q
    ? applications.filter((a) =>
        [a.applicant?.fullname, a.applicant?.email, a.applicant?.profile?.branch, ...(a.applicant?.profile?.skills || [])]
          .filter(Boolean)
          .some((s) => s.toLowerCase().includes(q))
      )
    : applications;
  return { opening, applications: filtered };
}

export const getApplicants = async (req, res) => {
  const { opening, applications } = await loadApplicants(req);
  res.json({ success: true, opening, applications });
};

export const exportApplicantsCsv = async (req, res) => {
  const { opening, applications } = await loadApplicants(req);
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
