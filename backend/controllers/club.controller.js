import mongoose from "mongoose";
import { Club } from "../model/club.model.js";
import { Opening, withIsOpen } from "../model/opening.model.js";
import { Application } from "../model/application.model.js";
import { Event } from "../model/event.model.js";
import { HttpError } from "../utils/http.js";
import { TZ, istDateKey } from "../utils/time.js";
import { uploadFile } from "../utils/cloudinary.js";
import { memo } from "../utils/memo.js";
import { searchIds } from "../utils/search.js";
import { invalidateCatalog } from "../ai/context.js";

// No `followers`: lists only need the count, and the array can be thousands of ids per club.
const CARD_FIELDS = "name shortName slug category tagline summary logo cover color icon memberCount followerCount skills";

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

// The ids of the clubs this student follows, in one indexed query, so a list never has to
// load each club's follower array to answer "am I following this one?".
const followedClubIds = async (userId) => (userId ? new Set((await Club.find({ followers: userId }).distinct("_id")).map(String)) : new Set());

const toCard = (club, counts, followed) => {
  const c = club.toObject ? club.toObject() : club;
  const open = counts[String(c._id)];
  return {
    ...c,
    followers: undefined,
    followerCount: c.followerCount || 0,
    isFollowing: followed.has(String(c._id)),
    openCount: open?.count || 0,
    nextDeadline: open?.nextDeadline || null,
  };
};

export const listClubs = async (req, res) => {
  const { q, category, recruiting, sort = "popular", includeArchived } = req.query;
  const filter = {};
  if (category && category !== "all") filter.category = category;
  if (includeArchived !== "true") filter.archivedAt = null;
  const matches = await searchIds(Club, filter, q, ["name", "shortName"]);
  if (matches) filter._id = { $in: matches };
  const [clubs, counts, followed] = await Promise.all([Club.find(filter).select(CARD_FIELDS).lean(), openCountsByClub(), followedClubIds(req.id)]);
  let cards = clubs.map((c) => toCard(c, counts, followed));
  if (recruiting === "true") cards = cards.filter((c) => c.openCount > 0);

  const sorters = {
    // Followers are earned; memberCount is self-reported by the club, so it only breaks ties.
    popular: (a, b) => b.followerCount - a.followerCount || b.memberCount - a.memberCount,
    name: (a, b) => a.name.localeCompare(b.name),
    recruiting: (a, b) => b.openCount - a.openCount || (a.nextDeadline || Infinity) - (b.nextDeadline || Infinity),
  };
  cards.sort(sorters[sort] || sorters.popular);
  // Optional ?limit= for callers that show a few (the home page). The whole set is small
  // (a college's clubs), so it is sorted first and cut after.
  const limit = Math.min(50, Math.max(0, Math.floor(Number(req.query.limit)) || 0));
  res.json({ success: true, clubs: limit ? cards.slice(0, limit) : cards });
};

export const categoryCounts = async (req, res) => {
  const categories = await memo("club:categories", 60_000, async () => {
    const rows = await Club.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    return rows.map((r) => ({ category: r._id, count: r.count }));
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ success: true, categories });
};

export const getClub = async (req, res) => {
  const club = await Club.findOne({ slug: req.params.slug.toLowerCase(), archivedAt: null }).select("-followers").populate("admins", "fullname").lean();
  if (!club) throw new HttpError(404, "Club not found.");

  const now = new Date();
  // Everything that needs only the club goes in one batch; the queries that need the ids
  // it returns (openings, related clubs) go in a second.
  const [openings, pastOpenings, events, byStatus, related, followed] = await Promise.all([
    Opening.find({ club: club._id, status: "open", deadline: { $gt: now } }).sort({ deadline: 1 }).lean(),
    Opening.find({ club: club._id, $or: [{ status: "closed" }, { deadline: { $lte: now } }] })
      .sort({ deadline: -1 })
      .limit(3)
      .select("title deadline mode")
      .lean(),
    Event.find({ club: club._id, date: { $gte: new Date(now.getTime() - 60 * 86400_000) } }).sort({ date: 1 }).limit(8).lean(),
    Application.aggregate([{ $match: { club: club._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Club.find({ category: club.category, _id: { $ne: club._id }, archivedAt: null }).select(CARD_FIELDS).limit(3).lean(),
    followedClubIds(req.id),
  ]);

  const openingIds = openings.map((o) => o._id);
  const [myApplications, applicantCounts, counts] = await Promise.all([
    req.id && openingIds.length ? Application.find({ applicant: req.id, opening: { $in: openingIds } }).select("opening status").lean() : [],
    openingIds.length ? Application.aggregate([{ $match: { opening: { $in: openingIds } } }, { $group: { _id: "$opening", count: { $sum: 1 } } }]) : [],
    openCountsByClub({ club: { $in: related.map((r) => r._id) } }),
  ]);
  const applied = new Map(myApplications.map((a) => [String(a.opening), a.status]));
  const countMap = Object.fromEntries(applicantCounts.map((r) => [String(r._id), r.count]));
  const status = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));

  res.json({
    success: true,
    club: {
      ...toCard(club, {}, followed),
      openCount: openings.length,
      stats: { applications: byStatus.reduce((total, s) => total + s.count, 0), accepted: status.accepted || 0, events: events.length },
    },
    openings: openings.map((o) => ({ ...withIsOpen(o), applicantCount: countMap[String(o._id)] || 0, myStatus: applied.get(String(o._id)) || null })),
    pastOpenings,
    events,
    related: related.map((r) => toCard(r, counts, followed)),
  });
};

// Each write is conditional on the current state and moves the array and the counter
// together, so a double click or two devices can't push followerCount out of step.
export const toggleFollow = async (req, res) => {
  const club = await Club.findOne({ slug: req.params.slug.toLowerCase() }).select("_id").lean();
  if (!club) throw new HttpError(404, "Club not found.");
  const followed = await Club.updateOne({ _id: club._id, followers: { $ne: req.id } }, { $addToSet: { followers: req.id }, $inc: { followerCount: 1 } });
  const following = followed.modifiedCount === 1;
  if (!following) await Club.updateOne({ _id: club._id, followers: req.id }, { $pull: { followers: req.id }, $inc: { followerCount: -1 } });
  res.json({ success: true, following, message: following ? "Following! We'll show you their updates." : "Unfollowed." });
};

// ---------- club admin ----------

export const getMyClub = async (req, res) => {
  if (!req.clubId) throw new HttpError(404, "Your account isn't linked to a club.");
  const club = await Club.findById(req.clubId).select("-followers").lean();
  if (!club) throw new HttpError(404, "Club not found.");
  res.json({ success: true, club });
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
  // `club` is the full document, and would send every follower id to the browser.
  res.json({ success: true, message: "Club page updated.", club: { ...club.toObject(), followers: undefined } });
};

export const myDashboard = async (req, res) => {
  if (!req.clubId) throw new HttpError(404, "Your account isn't linked to a club.");
  const clubId = new mongoose.Types.ObjectId(String(req.clubId));
  // A day of margin; only the last 14 Indian-time days are kept when building the chart.
  const since = new Date(Date.now() - 15 * 86400_000);

  const [club, byStatus, openOpenings, totalOpenings, perDay, recent, upcomingEvents] = await Promise.all([
    Club.findById(clubId).select("name shortName slug logo color followerCount memberCount").lean(),
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
    club,
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
