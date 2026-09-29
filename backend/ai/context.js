// Builds the facts the assistant answers from. Only public club data plus the
// current user's own profile and applications, never other students' data.
import { Club } from "../model/club.model.js";
import { Opening } from "../model/opening.model.js";
import { Event } from "../model/event.model.js";
import { Application } from "../model/application.model.js";
import { User } from "../model/user.model.js";
import { escapeRegex } from "../utils/http.js";
import { memo } from "../utils/memo.js";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// The club catalog changes rarely, so it is cached and sent in the (prompt-cached) system prompt.
let catalogCache = { text: "", at: 0 };
export async function clubCatalog() {
  if (catalogCache.text && Date.now() - catalogCache.at < 10 * 60_000) return catalogCache.text;
  const clubs = await Club.find().sort({ category: 1, name: 1 }).select("name shortName slug category tagline skills commitment lookingFor signatureEvents").lean();
  const text = clubs
    .map(
      (c) =>
        `- [${c.name}](/clubs/${c.slug}) · ${c.category} · "${c.tagline}" · skills: ${(c.skills || []).slice(0, 5).join(", ")} · time: ${c.commitment} · events: ${(c.signatureEvents || [])
          .slice(0, 3)
          .map((e) => e.name)
          .join(", ")} · for: ${c.lookingFor}`
    )
    .join("\n");
  catalogCache = { text, at: Date.now() };
  return text;
}
export const invalidateCatalog = () => (catalogCache = { text: "", at: 0 });

// Detailed facts for the clubs the question is most likely about.
export async function relevantClubs(query, limit = 3) {
  const words = (query || "")
    .toLowerCase()
    .split(/[^a-z0-9+#-]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return [];
  const fields = "name shortName slug category tagline pitch whyJoin signatureEvents skills commitment lookingFor socials";
  // The text index ranks by weighted matches (name and short name count most).
  const ranked = await Club.find({ archivedAt: null, $text: { $search: words.join(" ") } }, { score: { $meta: "textScore" } })
    .select(fields)
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .lean();
  if (ranked.length) return ranked;
  // Whole-word search found nothing: try the start of a name ("ieee", "robo") or slug.
  const rx = new RegExp(words.map((w) => `(^|[\\s-])${escapeRegex(w)}`).join("|"), "i");
  return Club.find({ archivedAt: null, $or: [{ name: rx }, { shortName: rx }, { slug: rx }] })
    .select(fields)
    .limit(limit)
    .lean();
}
const STOP = new Set("the and for you are can how what which who with about club clubs join want does have any this that from into more show tell give some best good".split(" "));

export const describeClub = (c) =>
  [
    `### ${c.name} (/clubs/${c.slug})`,
    c.pitch,
    `Why join: ${(c.whyJoin || []).map((w) => `${w.title}: ${w.text}`).join(" | ")}`,
    `Signature events: ${(c.signatureEvents || []).map((e) => `${e.name}: ${e.text}`).join(" | ")}`,
    `Skills: ${(c.skills || []).join(", ")} · Time: ${c.commitment} · Looking for: ${c.lookingFor}`,
  ].join("\n");

// The next two are the same for every student, so a minute of caching saves two queries on
// every message. Creating, editing or deleting an opening or event drops the entry.
export const openingsDigest = (limit = 15) =>
  memo(`openings:digest:${limit}`, 60_000, async () => {
    const openings = await Opening.find({ status: "open", deadline: { $gt: new Date() } })
      .sort({ deadline: 1 })
      .limit(limit)
      .populate("club", "name slug")
      .lean();
    if (!openings.length) return "No openings are accepting applications right now.";
    return openings.map((o) => `- [${o.title}](/openings/${o._id}) · ${o.club?.name} · ${o.mode} · closes ${fmtDate(o.deadline)}`).join("\n");
  });

export const eventsDigest = (limit = 8) =>
  memo(`events:digest:${limit}`, 60_000, async () => {
    const events = await Event.find({ date: { $gte: new Date() } }).sort({ date: 1 }).limit(limit).populate("club", "name slug").lean();
    if (!events.length) return "No upcoming events are listed.";
    return events.map((e) => `- ${e.title} · ${e.club?.name} · ${fmtDate(e.date)} · ${e.venue}`).join("\n");
  });

export async function userDigest(userId) {
  if (!userId) return "The student is browsing as a guest (not logged in). They must log in to apply or see their applications.";
  const [user, apps] = await Promise.all([
    User.findById(userId).select("fullname role profile").lean(),
    Application.find({ applicant: userId }).sort({ createdAt: -1 }).limit(10).populate("opening", "title").populate("club", "name slug").lean(),
  ]);
  if (!user) return "";
  const p = user.profile || {};
  const lines = [
    `Name: ${user.fullname} · role: ${user.role}`,
    p.branch ? `Branch: ${p.branch}${p.year ? `, year ${p.year}` : ""}` : "",
    p.interests?.length ? `Interests: ${p.interests.join(", ")}` : "",
    p.skills?.length ? `Skills: ${p.skills.join(", ")}` : "",
    apps.length
      ? `Their applications:\n${apps.map((a) => `- ${a.opening?.title} at ${a.club?.name}: ${a.status} (applied ${fmtDate(a.createdAt)})`).join("\n")}`
      : "They haven't applied anywhere yet.",
  ];
  return lines.filter(Boolean).join("\n");
}

export const today = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
