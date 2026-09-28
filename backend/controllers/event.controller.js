import { Event } from "../model/event.model.js";
import { Club } from "../model/club.model.js";
import { HttpError } from "../utils/http.js";
import { startOfIstDay } from "../utils/time.js";
import { assertOwnsClub } from "./club.controller.js";

export const listEvents = async (req, res) => {
  const { club, category, from } = req.query;
  // "Today" means today in India: the server's own midnight is UTC, which would hide
  // everything happening between midnight and 05:30 IST.
  const filter = { date: { $gte: from ? new Date(from) : startOfIstDay() } };
  if (club || (category && category !== "all")) {
    const clubFilter = {};
    if (club) clubFilter.slug = club;
    if (category && category !== "all") clubFilter.category = category;
    filter.club = { $in: await Club.find(clubFilter).distinct("_id") };
  }
  const events = await Event.find(filter).sort({ date: 1 }).limit(60).populate("club", "name shortName slug logo color category").lean();
  res.json({ success: true, events });
};

export const createEvent = async (req, res) => {
  if (!req.clubId) throw new HttpError(403, "Your account isn't linked to a club.");
  const event = await Event.create({ ...req.body, club: req.clubId });
  res.status(201).json({ success: true, message: "Event added.", event });
};

export const deleteEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, "Event not found.");
  assertOwnsClub(req, event.club);
  await event.deleteOne();
  res.json({ success: true, message: "Event removed." });
};
