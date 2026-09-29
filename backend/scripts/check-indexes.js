// Fails if a hot query would scan a whole collection.
//
//   npm run check:indexes
//
// Starts a throwaway in-memory MongoDB (nothing to configure, and it can never touch a real
// database), fills it with enough documents that the planner has a real choice, builds the
// indexes the models declare, and runs explain() on the queries the controllers make. A
// COLLSCAN in any winning plan is a missing or unused index. Add a query here when you add
// a controller query that runs on every page view.
import mongoose from "mongoose";
import { startTestDb } from "../tests/helpers/testDb.js";

process.env.MONGO_DB = `joinclub_test_indexes_${process.pid}`;
const { default: connectDB } = await import("../utils/db.js");
const { Club } = await import("../model/club.model.js");
const { Opening } = await import("../model/opening.model.js");
const { Event } = await import("../model/event.model.js");
const { Application } = await import("../model/application.model.js");
const { User } = await import("../model/user.model.js");
const { ChatSession, ChatMessage } = await import("../model/chat.model.js");

const id = () => new mongoose.Types.ObjectId();
const pick = (arr, i) => arr[i % arr.length];
const day = 86400_000;
const now = Date.now();
const N = 2000;

const { uri, stop } = await startTestDb();
let failures = 0;
try {
  await connectDB(uri);
  const models = [Club, Opening, Event, Application, User, ChatSession, ChatMessage];

  const clubs = Array.from({ length: 50 }, (_, i) => ({ _id: id(), name: `Club ${i}`, slug: `club-${i}`, category: pick(["technical", "cultural", "social"], i), tagline: `tagline ${i}`, followers: [], followerCount: 0, archivedAt: null }));
  const users = Array.from({ length: N }, (_, i) => ({ _id: id(), fullname: `User ${i}`, email: `u${i}@x.dev`, password: "x", role: i === 0 ? "super_admin" : i < 60 ? "club_admin" : "student" }));
  for (const [i, u] of users.entries()) if (i % 3 === 0) pick(clubs, i).followers.push(u._id);
  const openings = Array.from({ length: 400 }, (_, i) => ({ _id: id(), club: pick(clubs, i)._id, title: `Opening ${i} robotics`, description: "d", deadline: new Date(now + (i % 20 - 5) * day), status: i % 7 ? "open" : "closed", createdBy: users[1]._id }));
  const events = Array.from({ length: 400 }, (_, i) => ({ club: pick(clubs, i)._id, title: `Event ${i}`, date: new Date(now + (i % 30 - 10) * day) }));
  const apps = Array.from({ length: N * 3 }, (_, i) => ({ opening: pick(openings, i)._id, club: pick(openings, i).club, applicant: pick(users, i * 7)._id, status: pick(["pending", "accepted", "rejected"], i), createdAt: new Date(now - i * 60_000), answers: [] }));
  const sessions = Array.from({ length: 600 }, (_, i) => ({ _id: id(), user: pick(users, i)._id, mode: "helpdesk", updatedAt: new Date(now - i * 60_000) }));
  const messages = Array.from({ length: 6000 }, (_, i) => ({ session: pick(sessions, i)._id, role: "user", content: "hi", createdAt: new Date(now - i * 1000) }));

  // Indexes first, so the unique {opening, applicant} one filters the synthetic duplicates.
  await Promise.all(models.map((m) => m.syncIndexes()));
  await Promise.all([
    Club.collection.insertMany(clubs),
    User.collection.insertMany(users),
    Opening.collection.insertMany(openings),
    Event.collection.insertMany(events),
    // {opening, applicant} is unique; the synthetic ids can repeat, so ignore those rows.
    Application.collection.insertMany(apps, { ordered: false }).catch(() => {}),
    ChatSession.collection.insertMany(sessions),
    ChatMessage.collection.insertMany(messages),
  ]);

  const club = clubs[3];
  const student = users[100];
  const session = sessions[5];
  const opening = openings[9];
  const soon = new Date(now);

  // [name, () => explain-able query]. `todo` marks queries deliberately left without an index.
  const checks = [
    ["openings of one club that are open (club page, open counts)", () => Opening.find({ club: club._id, status: "open", deadline: { $gt: soon } }).sort({ deadline: 1 })],
    ["all open openings by deadline (home page, openings list)", () => Opening.find({ status: "open", deadline: { $gt: soon } }).sort({ deadline: 1, _id: 1 })],
    ["a club's past openings", () => Opening.find({ club: club._id, status: "closed" }).sort({ deadline: -1 })],
    ["one club's events by date", () => Event.find({ club: club._id, date: { $gte: soon } }).sort({ date: 1 })],
    ["upcoming events by date (home page, assistant)", () => Event.find({ date: { $gte: soon } }).sort({ date: 1 })],
    ["a student's applications, newest first (My Applications, assistant)", () => Application.find({ applicant: student._id }).sort({ createdAt: -1, _id: -1 })],
    ["a student's application to one opening", () => Application.find({ opening: opening._id, applicant: student._id })],
    ["a club's applications by status (dashboard)", () => Application.find({ club: club._id, status: "pending" }).sort({ createdAt: -1 })],
    ["applicants of one opening", () => Application.find({ opening: opening._id }).sort({ createdAt: -1, _id: -1 })],
    ["a user's chats, most recent first (history sidebar)", () => ChatSession.find({ user: student._id }).sort({ updatedAt: -1 })],
    ["one chat's messages in order", () => ChatMessage.find({ session: session._id }).sort({ createdAt: 1 })],
    ["students count (site stats)", () => User.find({ role: "student" })],
    ["clubs a student follows (isFollowing)", () => Club.find({ followers: student._id })],
    ["club by slug", () => Club.find({ slug: club.slug })],
    ["user by email (login)", () => User.find({ email: student.email })],
    ["club search by text", () => Club.find({ $text: { $search: "tagline" } })],
    ["opening search by text", () => Opening.find({ status: "open", deadline: { $gt: soon }, $text: { $search: "robotics" } })],
  ];

  const stages = (plan, out = []) => {
    if (!plan || typeof plan !== "object") return out;
    if (plan.stage) out.push(plan.stage);
    for (const v of Object.values(plan)) if (typeof v === "object") stages(v, out);
    return out;
  };

  for (const [name, query] of checks) {
    const explained = await query().explain("queryPlanner");
    const winning = stages(explained.queryPlanner.winningPlan);
    const scan = winning.includes("COLLSCAN");
    if (scan) failures++;
    console.log(`${scan ? "FAIL" : "ok  "}  ${name}  [${winning.join(" > ")}]`);
  }
} finally {
  await mongoose.disconnect().catch(() => {});
  await stop();
}

if (failures) {
  console.error(`\n${failures} query plan(s) scan the whole collection. Add or fix an index in the model.`);
  process.exit(1);
}
console.log("\nAll checked queries use an index.");
