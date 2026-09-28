import mongoose from "mongoose";
import { Club } from "../model/club.model.js";
import { Opening, withIsOpen } from "../model/opening.model.js";
import { Application } from "../model/application.model.js";
import { Event } from "../model/event.model.js";
import { HttpError, escapeRegex } from "../utils/http.js";
import { TZ, istDateKey } from "../utils/time.js";
import { uploadFile } from "../utils/cloudinary.js";
import { invalidateCatalog } from "../ai/context.js";

const CARD_FIELDS = "name shortName slug category tagline summary logo cover color icon memberCount followers skills";

export const assertOwnsClub = (req, clubId) => {
  if (req.role === "super_admin") return;
  if (req.role !== "club_admin" || String(clubId) !== String(req.clubId)) {
    throw new HttpError(403, "Only this club's admin can do that.");
  }
};

// { clubId: numberOfOpenOpenings }
async function openCountsByClub(match = {}) {
  const rows = await Opening.aggregate([
    { $match: { status: "open", deadline: { $gt: new Date() }, ...match } },
    { $group: { _id: "$club", count: { $sum: 1 }, nextDeadline: { $min: "$deadline" } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r]));
}

const toCard = (club, counts, userId) => {
  const c = club.toObject ? club.toObject() : club;
  const open = counts[String(c._id)];
  return {
    ...c,
    followers: undefined,
    followerCount: c.followers?.length || 0,
    isFollowing: userId ? c.followers?.some((f) => String(f) === String(userId)) : false,
    openCount: open?.count || 0,
    nextDeadline: open?.nextDeadline || null,
  };
};

export const listClubs = async (req, res) => {
  const { q, category, recruiting, sort = "popular", includeArchived } = req.query;
  const filter = {};
  if (category && category !== "all") filter.category = category;
  if (includeArchived !== "true") filter.archivedAt = null;
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ name: rx }, { shortName: rx }, { tagline: rx }, { summary: rx }, { skills: rx }, { activities: rx }];
  }
  const [clubs, counts] = await Promise.all([Club.find(filter).select(CARD_FIELDS).lean(), openCountsByClub()]);
  let cards = clubs.map((c) => toCard(c, counts, req.id));
  if (recruiting === "true") cards = cards.filter((c) => c.openCount > 0);

  const sorters = {
    // Followers are earned; memberCount is self-reported by the club, so it only breaks ties.
    popular: (a, b) => b.followerCount - a.followerCount || b.memberCount - a.memberCount,
    name: (a, b) => a.name.localeCompare(b.name),
    recruiting: (a, b) => b.openCount - a.openCount || (a.nextDeadline || Infinity) - (b.nextDeadline || Infinity),
  };
  cards.sort(sorters[sort] || sorters.popular);
  res.json({ success: true, clubs: cards });
};

export const categoryCounts = async (req, res) => {
  const rows = await Club.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
  res.json({ success: true, categories: rows.map((r) => ({ category: r._id, count: r.count })) });
};

export const getClub = async (req, res) => {
  const club = await Club.findOne({ slug: req.params.slug.toLowerCase(), archivedAt: null }).populate("admins", "fullname").lean();
  if (!club) throw new HttpError(404, "Club not found.");

  const now = new Date();
  const [openings, pastOpenings, events, applicationCount, acceptedCount, related] = await Promise.all([
    Opening.find({ club: club._id, status: "open", deadline: { $gt: now } }).sort({ deadline: 1 }).lean(),
    Opening.find({ club: club._id, $or: [{ status: "closed" }, { deadline: { $lte: now } }] })
      .sort({ deadline: -1 })
      .limit(3)
      .select("title deadline mode")
      .lean(),
    Event.find({ club: club._id, date: { $gte: new Date(now.getTime() - 60 * 86400_000) } }).sort({ date: 1 }).limit(8).lean(),
    Application.countDocuments({ club: club._id }),
    Application.countDocuments({ club: club._id, status: "accepted" }),
    Club.find({ category: club.category, _id: { $ne: club._id } }).select(CARD_FIELDS).limit(3).lean(),
  ]);

  let myApplications = [];
  if (req.id && openings.length) {
    myApplications = await Application.find({ applicant: req.id, opening: { $in: openings.map((o) => o._id) } })
      .select("opening status")
      .lean();
  }
  const applied = new Map(myApplications.map((a) => [String(a.opening), a.status]));
  const applicantCounts = await Application.aggregate([
    { $match: { opening: { $in: openings.map((o) => o._id) } } },
    { $group: { _id: "$opening", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(applicantCounts.map((r) => [String(r._id), r.count]));

  const counts = await openCountsByClub({ club: { $in: related.map((r) => r._id) } });
  res.json({
    success: true,
    club: {
      ...toCard(club, {}, req.id),
      openCount: openings.length,
      stats: { applications: applicationCount, accepted: acceptedCount, events: events.length },
    },
    openings: openings.map((o) => ({ ...withIsOpen(o), applicantCount: countMap[String(o._id)] || 0, myStatus: applied.get(String(o._id)) || null })),
    pastOpenings,
    events,
    related: related.map((r) => toCard(r, counts, req.id)),
  });
};

export const toggleFollow = async (req, res) => {
  const club = await Club.findOne({ slug: req.params.slug.toLowerCase() }).select("followers");
  if (!club) throw new HttpError(404, "Club not found.");
  const following = club.followers.some((f) => String(f) === String(req.id));
  await Club.updateOne({ _id: club._id }, following ? { $pull: { followers: req.id } } : { $addToSet: { followers: req.id } });
  res.json({ success: true, following: !following, message: following ? "Unfollowed." : "Following! We'll show you their updates." });
};

// ---------- club admin ----------

export const getMyClub = async (req, res) => {
  if (!req.clubId) throw new HttpError(404, "Your account isn't linked to a club.");
  const club = await Club.findById(req.clubId).lean();
  if (!club) throw new HttpError(404, "Club not found.");
  res.json({ success: true, club: { ...club, followers: undefined, followerCount: club.followers.length } });
};

export const updateMyClub = async (req, res) => {
  const club = await Club.findById(req.clubId);
  if (!club) throw new HttpError(404, "Club not found.");
  assertOwnsClub(req, club._id);

  const editable = ["tagline", "pitch", "summary", "about", "whyJoin", "activities", "signatureEvents", "skills", "lookingFor", "commitment", "socials", "color", "foundedYear", "memberCount"];
  for (const key of editable) if (req.body[key] !== undefined) club[key] = req.body[key];

  const logo = req.files?.logo?.[0];
  const cover = req.files?.cover?.[0];
  if (logo) club.logo = await uploadFile(logo, "joinclub/clubs");
  if (cover) club.cover = await uploadFile(cover, "joinclub/clubs");

  await club.save();
  invalidateCatalog(); // the assistant should see the new copy right away
  res.json({ success: true, message: "Club page updated.", club });
};

export const myDashboard = async (req, res) => {
  if (!req.clubId) throw new HttpError(404, "Your account isn't linked to a club.");
  const clubId = new mongoose.Types.ObjectId(String(req.clubId));
  // A day of margin; only the last 14 Indian-time days are kept when building the chart.
  const since = new Date(Date.now() - 15 * 86400_000);

  const [club, byStatus, openOpenings, totalOpenings, perDay, recent, upcomingEvents] = await Promise.all([
    Club.findById(clubId).select("name shortName slug logo color followers memberCount").lean(),
    Application.aggregate([{ $match: { club: clubId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Opening.countDocuments({ club: clubId, status: "open", deadline: { $gt: new Date() } }),
    Opening.countDocuments({ club: clubId }),
    Application.aggregate([
      { $match: { club: clubId, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Application.find({ club: clubId })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("applicant", "fullname profile.branch profile.year profile.profilePhoto")
      .populate("opening", "title")
      .lean(),
    Event.find({ club: clubId, date: { $gte: new Date() } }).sort({ date: 1 }).limit(4).lean(),
  ]);
  if (!club) throw new HttpError(404, "Club not found.");

  const status = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = istDateKey(new Date(Date.now() - i * 86400_000));
    days.push({ date: key, count: perDay.find((p) => p._id === key)?.count || 0 });
  }
  res.json({
    success: true,
    club: { ...club, followers: undefined, followerCount: club.followers.length },
    stats: {
      openOpenings,
      totalOpenings,
      totalApplications: Object.values(status).reduce((a, b) => a + b, 0),
      pending: status.pending || 0,
      shortlisted: status.shortlisted || 0,
      accepted: status.accepted || 0,
      rejected: status.rejected || 0,
    },
    perDay: days,
    recent,
    upcomingEvents,
  });
};
