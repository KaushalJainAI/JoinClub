// Seeds the database with the scraped PEC clubs, the club admin accounts, and (in demo
// mode) realistic dummy students.
//
//   npm run seed:clubs                     clubs, club admins, super admin. Safe for production.
//   npm run seed:demo                      the above plus ~150 fake students, openings, applications.
//   npm run seed                            everything (alias of seed:demo, for local work)
//
// Options for both: -- --reset wipes the app's collections first (asks you to type the
// database name on a real database), -- --reset-admin-passwords gives every club admin a
// new password, -- --allow-remote permits a non-local MONGO_URI.
//
// Club admin (and demo) logins are written to output/club-admin-credentials.csv.
// That file holds plain-text passwords: it is git-ignored, so share it privately.
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { fakerEN_IN as faker } from "@faker-js/faker";
import connectDB from "../utils/db.js";
import { Club } from "../model/club.model.js";
import { User, BRANCHES } from "../model/user.model.js";
import { Opening } from "../model/opening.model.js";
import { Application } from "../model/application.model.js";
import { Event } from "../model/event.model.js";
import { Otp } from "../model/otp.model.js";
import { ChatSession, ChatMessage } from "../model/chat.model.js";
import { PROFILES, CATEGORY_DEFAULTS } from "../data/club-profiles.js";
import { generatePassword } from "../utils/password.js";
import { toCsv } from "../utils/http.js";
import { mirrorImage } from "../utils/cloudinary.js";
import { guardSeed } from "./seed-guard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const RESET = args.has("--reset");
const RESET_ADMIN_PASSWORDS = args.has("--reset-admin-passwords");
// Off with --no-copy-images, for a seed that must not touch the network or the API.
const COPY_IMAGES = !args.has("--no-copy-images");

// The demo half is skipped when the script is run as seed:clubs, so the same code can be
// pointed at production to add a club without creating 150 fake students.
const DEMO_MODE = !args.has("--clubs-only");
const withDemoData = DEMO_MODE;

await guardSeed({ reset: RESET, allowRemote: args.has("--allow-remote"), withDemoData });
if (!DEMO_MODE) console.log("Running seed:clubs (no dummy students, openings, applications or events).");

const STUDENT_COUNT = 150;
const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || "joinclub.pec";
// Reserved test domain: dummy students can never receive real email.
const STUDENT_DOMAIN = "demo.joinclub.test";
const DEMO_STUDENT = { email: `student@${STUDENT_DOMAIN}`, password: "Student@123" };
const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0];
const DAY = 86400_000;

faker.seed(2026);
const rand = (min, max) => faker.number.int({ min, max });
const pick = (arr) => arr[rand(0, arr.length - 1)];
const sample = (arr, n) => faker.helpers.arrayElements(arr, Math.min(n, arr.length));

// ---------- opening templates ----------

const OPENING_TEMPLATES = {
  technical: [
    {
      title: (c) => `${c.shortName} Core Team Recruitment 2026`,
      mode: "recruitment",
      description: (c) =>
        `${c.shortName} is looking for curious first and second years to join the core team. You'll learn from seniors, work on real projects and help run our events. ${c.pitch}`,
      requirements: (c) => ["Open to all branches", "Curiosity over experience", ...(c.skills || []).slice(0, 2).map((s) => `Interest in ${s}`)],
      questions: (c) => [`Why do you want to join ${c.shortName}?`, "Tell us about something you built, fixed or taught yourself.", "How many hours a week can you commit?"],
    },
    {
      title: (c) => `${(c.signatureEvents?.[0]?.name) || c.shortName} Organising Team`,
      mode: "event",
      description: (c) => `Help plan and run ${(c.signatureEvents?.[0]?.name) || "our flagship event"}: ${(c.signatureEvents?.[0]?.text) || c.tagline} We need hands for logistics, design, sponsorship and tech.`,
      requirements: () => ["Good communication", "Available during event week", "Team player"],
      questions: () => ["Which team would you like to work in (logistics, design, sponsorship or tech) and why?", "Describe a time you helped organise something."],
    },
    {
      title: (c) => `Hands-on Workshop: ${(c.skills || ["Fundamentals"])[0]} for Beginners`,
      mode: "workshop",
      description: (c) => `A free two-day beginner workshop by ${c.shortName}. No experience needed; just bring a laptop and your curiosity.`,
      requirements: () => ["Laptop", "No prior experience needed"],
      questions: () => ["What do you hope to learn from this workshop?"],
    },
  ],
  cultural: [
    {
      title: (c) => `${c.shortName} Auditions 2026`,
      mode: "recruitment",
      description: (c) => `Auditions are open! ${c.pitch} Come show us what you've got. Freshers are especially welcome.`,
      requirements: (c) => ["Open to all years", ...(c.activities || []).slice(0, 2).map((a) => `Interest in ${a.toLowerCase()}`)],
      questions: (c) => [`What draws you to ${c.shortName}?`, "Share your experience (performances, portfolio links or anything you've created).", "Which of our events would you most like to be part of?"],
    },
    {
      title: (c) => `${(c.signatureEvents?.[0]?.name) || c.shortName} Volunteers`,
      mode: "event",
      description: (c) => `Be part of the team behind ${(c.signatureEvents?.[0]?.name) || "our flagship event"}. ${(c.signatureEvents?.[0]?.text) || ""}`,
      requirements: () => ["Available on event days", "Enthusiasm!"],
      questions: () => ["How would you like to contribute to the event?"],
    },
  ],
  literary: [
    {
      title: (c) => `${c.shortName} Recruitment Drive`,
      mode: "recruitment",
      description: (c) => `${c.pitch} We're recruiting writers, speakers and organisers.`,
      requirements: () => ["Love for words", "Any branch, any year"],
      questions: (c) => [`Why ${c.shortName}?`, "Share a piece of writing, a debate motion you'd love to argue, or a quiz question you'd set.", "What would you like to organise with us?"],
    },
  ],
  social: [
    {
      title: (c) => `Join ${c.shortName}: Volunteer Intake`,
      mode: "recruitment",
      description: (c) => `${c.pitch} We're welcoming new volunteers for this semester.`,
      requirements: () => ["Commitment to regular activities", "Empathy and reliability"],
      questions: (c) => [`Why do you want to volunteer with ${c.shortName}?`, "Tell us about a time you helped someone or your community."],
    },
  ],
  sports: [
    {
      title: () => "Inter-Year Team Trials",
      mode: "recruitment",
      description: () => "Trials for the Inter-Year and Inter-Department tournaments that count toward the General Championship Trophy.",
      requirements: () => ["Sports kit", "Medical fitness"],
      questions: () => ["Which sport(s) and position do you play?", "Tell us about your playing experience."],
    },
  ],
};

const ANSWER_BANK = [
  (c) => `I've followed ${c.shortName}'s work since orientation and ${c.signatureEvents?.[0]?.name || "your events"} really stood out to me. I want to learn from seniors and contribute seriously.`,
  (c) => `In school I ${pick(["led the science club", "organised our annual fest", "built small Arduino projects", "wrote for the school magazine", "performed at inter-school competitions", "volunteered at an NGO on weekends"])}, and ${c.shortName} feels like the natural next step. I'm especially excited about ${pick(c.activities || ["your activities"]).toLowerCase()}.`,
  () => `I'm passionate and hardworking and I always wanted to join a club like this.`,
  (c) => `Honestly, I'm a beginner, but I learn fast. Over the summer I taught myself ${pick(c.skills || ["new skills"])} from online courses and I'd love to build on that with a team.`,
  () => `I can give around ${rand(4, 10)} hours a week, more around events. I've planned my timetable so that labs don't clash with weekend activities.`,
  () => `Last year I ${pick(["made a line-following robot for a school exhibition", "directed a short film with friends", "organised a blood donation drive", "ran a small Instagram page on photography", "won a district-level debate"])}. It taught me how to plan, fail and try again.`,
];

const TESTIMONIALS = {
  technical: [
    (c) => `I joined ${c.shortName} knowing almost nothing. Two semesters later I've shipped real projects, and the seniors are the best teachers I've had.`,
    (c) => `${c.signatureEvents?.[0]?.name || "Our flagship event"} was the most intense and fun week of my first year. You learn more there than in any lab.`,
    (c) => `Being in ${c.shortName} made my résumé, but more importantly it gave me friends who build things for fun.`,
  ],
  cultural: [
    (c) => `${c.shortName} is my family on campus. ${c.signatureEvents?.[0]?.name || "Our events"} on stage with them is a feeling I can't describe.`,
    (c) => `I came in shy. ${c.shortName} gave me a stage, and now I actually look forward to performing.`,
    () => `The seniors genuinely teach you. No gatekeeping, just a lot of practice and a lot of fun.`,
  ],
  literary: [
    (c) => `${c.shortName} taught me to think on my feet. My interviews got so much easier after a year here.`,
    () => `I found people who love the same books and arguments I do. Best decision of first year.`,
  ],
  social: [
    (c) => `Working with ${c.shortName} reminded me why I wanted to become an engineer: to actually help people.`,
    () => `The drives are hard work but seeing the impact first-hand is worth every hour.`,
  ],
  sports: [() => `Playing for my year in the Inter-Year matches is the most hyped I've ever been on campus.`, () => `Great facilities, and a great way to switch off from academics.`],
};

const VENUES = ["Main Auditorium", "Student Activity Centre", "Lecture Theatre 1", "Main Lawns", "Library Seminar Hall", "Sports Complex", "Old Auditorium"];
const EVENT_TYPE = { technical: "competition", cultural: "performance", literary: "competition", social: "social", sports: "competition" };

// ---------- steps ----------

async function resetCollections() {
  console.log("Resetting collections…");
  await Promise.all([User, Club, Opening, Application, Event, Otp, ChatSession, ChatMessage].map((m) => m.deleteMany({})));
}

function buildClubDoc(scraped) {
  const profile = PROFILES[scraped.slug] || {};
  const category = profile.category || scraped.category;
  const defaults = CATEGORY_DEFAULTS[category];
  const shortName = profile.shortName || scraped.name.match(/\(([^)]+)\)/)?.[1] || scraped.name.split(" ")[0];
  const logo = scraped.logo || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(shortName)}&backgroundColor=${defaults.color.slice(1)}`;
  const doc = {
    slug: scraped.slug,
    name: profile.name || scraped.name,
    shortName,
    category,
    tagline: profile.tagline || scraped.summary.split(".")[0],
    pitch: profile.pitch || scraped.summary,
    summary: scraped.summary,
    about: scraped.about,
    whyJoin: profile.whyJoin || [],
    activities: profile.activities || [],
    signatureEvents: profile.signatureEvents || [],
    skills: profile.skills || [],
    lookingFor: profile.lookingFor || "Anyone curious and willing to learn.",
    commitment: profile.commitment || defaults.commitment,
    logo,
    cover: scraped.cover || "",
    gallery: scraped.gallery || [],
    color: defaults.color,
    icon: defaults.icon,
    foundedYear: profile.foundedYear,
    leadership: scraped.leadership || [],
    socials: scraped.socials || {},
    sourceUrl: scraped.sourceUrl,
  };
  return doc;
}

async function seedClubs() {
  const data = JSON.parse(await fs.readFile(path.join(__dirname, "..", "data", "pec-clubs.json"), "utf8"));
  const clubs = [];
  for (const scraped of data.clubs) {
    const doc = buildClubDoc(scraped);
    const existing = await Club.findOne({ slug: doc.slug });
    // Existing clubs keep edits their admins made; only missing fields are filled in.
    const club = existing
      ? await Club.findByIdAndUpdate(existing._id, { $set: { sourceUrl: doc.sourceUrl } }, { new: true })
      : await Club.create({
          ...doc,
          memberCount: rand(35, 180),
          testimonials: sample(TESTIMONIALS[doc.category], 2).map((t) => ({
            name: faker.person.fullName(),
            branch: pick(BRANCHES),
            year: rand(2, 4),
            quote: t(doc),
          })),
        });
    clubs.push(club);
  }
  console.log(`Clubs: ${clubs.length} (from ${data.clubs.length} scraped on ${data.scrapedAt.slice(0, 10)})`);
  if (COPY_IMAGES) await mirrorClubImages(clubs);
  return clubs;
}

// Club logos are hotlinked from pec.ac.in, which can rename a file or block hotlinking and
// leave every club page with a broken image. Copy them into Cloudinary once, and keep the
// PEC page as the source so the credit is traceable.
async function mirrorClubImages(clubs) {
  if (!process.env.CLOUD_NAME) {
    console.log("Images: Cloudinary is not configured, so club logos stay as pec.ac.in URLs (set CLOUD_NAME to copy them).");
    return;
  }
  let copied = 0;
  for (const club of clubs) {
    const logo = await mirrorImage(club.logo, "joinclub/clubs");
    if (logo !== club.logo) {
      club.logo = logo;
      await club.save();
      copied += 1;
    }
  }
  console.log(`Images: copied ${copied} club logo${copied === 1 ? "" : "s"} into Cloudinary (source: pec.ac.in)`);
}

async function seedAdmins(clubs) {
  const credentials = [];
  for (const club of clubs) {
    const handle = club.shortName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const email = `${handle}.admin@${ADMIN_DOMAIN}`;
    let admin = await User.findOne({ email });
    let password = "(unchanged; run seed with --reset-admin-passwords)";
    if (!admin || RESET_ADMIN_PASSWORDS) {
      password = generatePassword();
      const hash = await bcrypt.hash(password, 10);
      admin = admin
        ? await User.findByIdAndUpdate(admin._id, { password: hash, mustChangePassword: true }, { new: true })
        : await User.create({ fullname: `${club.shortName} Admin`, email, password: hash, role: "club_admin", club: club._id, mustChangePassword: true, emailVerified: true });
    }
    await Club.updateOne({ _id: club._id }, { $addToSet: { admins: admin._id } });
    credentials.push({ role: "club_admin", club, admin, password });
  }

  const superEmail = (process.env.SUPER_ADMIN_EMAIL || `admin@${ADMIN_DOMAIN}`).toLowerCase();
  let superAdmin = await User.findOne({ email: superEmail });
  let superPassword = "(unchanged)";
  if (!superAdmin) {
    superPassword = process.env.SUPER_ADMIN_PASSWORD || generatePassword();
    superAdmin = await User.create({ fullname: "JoinClub Super Admin", email: superEmail, password: await bcrypt.hash(superPassword, 10), role: "super_admin", emailVerified: true });
  }
  credentials.push({ role: "super_admin", admin: superAdmin, password: process.env.SUPER_ADMIN_PASSWORD ? "(from SUPER_ADMIN_PASSWORD in .env)" : superPassword });
  console.log(`Club admins: ${clubs.length} · super admin: ${superEmail}`);
  return credentials;
}

async function seedStudents() {
  const existing = await User.countDocuments({ role: "student", email: new RegExp(`@${STUDENT_DOMAIN.replace(/\./g, "\\.")}$`) });
  const demoHash = await bcrypt.hash(DEMO_STUDENT.password, 10);
  const skillsPool = ["Python", "C++", "Java", "React", "Arduino", "CAD", "Photoshop", "Public speaking", "Guitar", "Singing", "Dance", "Writing", "Video editing", "Photography", "Leadership", "Excel", "MATLAB", "Figma", "Machine learning", "Football"];
  const interestPool = ["Coding", "Robotics", "Music", "Dance", "Theatre", "Photography", "Film-making", "Debating", "Writing", "Quizzing", "Startups", "Social work", "Sports", "Astronomy", "Cars", "Aeromodelling", "Design", "Sustainability"];

  if (!(await User.exists({ email: DEMO_STUDENT.email }))) {
    await User.create({
      fullname: "Aarav Sharma",
      email: DEMO_STUDENT.email,
      password: demoHash,
      role: "student",
      emailVerified: true,
      phoneNumber: "9876543210",
      profile: { branch: "Computer Science", year: 2, sid: "24103001", bio: "Second-year CSE. I like building web apps and playing guitar.", skills: ["React", "Python", "Guitar"], interests: ["Coding", "Music", "Startups"] },
    });
  }

  const docs = [];
  for (let i = existing; i < STUDENT_COUNT; i++) {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const year = rand(1, 4);
    const batch = 26 - year;
    docs.push({
      fullname: `${first} ${last}`,
      email: `${first}.${last}.${batch}${String(i).padStart(3, "0")}@${STUDENT_DOMAIN}`.toLowerCase().replace(/[^a-z0-9.@]/g, ""),
      password: demoHash,
      role: "student",
      emailVerified: true,
      phoneNumber: `9${rand(100000000, 999999999)}`,
      profile: {
        branch: pick(BRANCHES),
        year,
        sid: `${batch}10${String(rand(1000, 9999))}`,
        bio: faker.helpers.maybe(() => `${pick(["Curious", "Enthusiastic", "Easy-going", "Driven"])} ${pick(["builder", "performer", "reader", "problem-solver", "creator"])} who loves ${pick(interestPool).toLowerCase()}.`, { probability: 0.7 }) || "",
        skills: sample(skillsPool, rand(2, 5)),
        interests: sample(interestPool, rand(2, 4)),
      },
    });
  }
  if (docs.length) await User.insertMany(docs);
  const students = await User.find({ role: "student" }).select("_id profile").lean();
  console.log(`Students: ${students.length} (demo login ${DEMO_STUDENT.email} / ${DEMO_STUDENT.password})`);
  return students;
}

async function seedOpenings(clubs, adminsByClub) {
  if (await Opening.exists({})) {
    console.log("Openings: already seeded, skipping");
    return Opening.find().lean();
  }
  const now = Date.now();
  const docs = [];
  for (const club of clubs) {
    const templates = OPENING_TEMPLATES[club.category] || OPENING_TEMPLATES.technical;
    const count = Math.min(templates.length, rand(1, 3));
    templates.slice(0, count).forEach((t, i) => {
      // Roughly: 15% already closed, 20% closing within 3 days, the rest open for 1-5 weeks.
      const r = faker.number.float();
      const deadline = r < 0.15 ? now - rand(3, 25) * DAY : r < 0.35 ? now + rand(1, 3) * DAY + rand(1, 20) * 3600_000 : now + rand(7, 35) * DAY;
      const createdAt = new Date(Math.min(deadline, now) - rand(10, 30) * DAY);
      docs.push({
        club: club._id,
        title: t.title(club),
        description: t.description(club),
        requirements: t.requirements(club),
        questions: t.questions(club),
        positions: t.mode === "workshop" ? rand(40, 120) : rand(5, 25),
        deadline: new Date(deadline),
        mode: t.mode,
        status: deadline < now ? "closed" : "open",
        createdBy: adminsByClub.get(String(club._id)),
        createdAt,
        updatedAt: createdAt,
        __v: 0,
      });
      if (i === 0 && club.slug === "ieee") docs.at(-1).positions = 30;
    });
  }
  await Opening.collection.insertMany(docs);
  console.log(`Openings: ${docs.length}`);
  return Opening.find().lean();
}

async function seedApplications(openings, students, clubsById) {
  if (await Application.exists({})) {
    console.log("Applications: already seeded, skipping");
    return;
  }
  const now = Date.now();
  const seen = new Set();
  const docs = [];
  const target = 420;
  let guard = 0;
  while (docs.length < target && guard++ < target * 5) {
    const opening = pick(openings);
    const student = pick(students);
    const key = `${opening._id}:${student._id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const club = clubsById.get(String(opening.club));
    const closed = new Date(opening.deadline).getTime() < now;
    const status = closed ? faker.helpers.weightedArrayElement([{ weight: 3, value: "accepted" }, { weight: 5, value: "rejected" }, { weight: 1, value: "withdrawn" }]) : faker.helpers.weightedArrayElement([{ weight: 7, value: "pending" }, { weight: 2, value: "shortlisted" }, { weight: 1, value: "rejected" }]);
    const windowStart = new Date(opening.createdAt).getTime();
    const windowEnd = Math.min(now, new Date(opening.deadline).getTime());
    const createdAt = new Date(rand(windowStart, Math.max(windowStart + 1, windowEnd)));
    docs.push({
      opening: opening._id,
      club: opening.club,
      applicant: student._id,
      answers: opening.questions.map((question) => ({ question, answer: pick(ANSWER_BANK)(club) })),
      status,
      adminNote: "",
      createdAt,
      updatedAt: createdAt,
      __v: 0,
    });
  }
  await Application.collection.insertMany(docs);
  console.log(`Applications: ${docs.length}`);
}

async function seedEvents(clubs) {
  if (await Event.exists({})) {
    console.log("Events: already seeded, skipping");
    return;
  }
  const now = Date.now();
  const docs = [];
  for (const club of clubs) {
    const signature = club.signatureEvents?.length ? club.signatureEvents : [{ name: `${club.shortName} Meetup`, text: club.tagline }];
    for (const [i, ev] of signature.slice(0, rand(1, 3)).entries()) {
      const date = new Date(now + (i === 0 && faker.datatype.boolean(0.2) ? -rand(3, 20) : rand(2, 70)) * DAY);
      date.setHours(pick([10, 14, 16, 17, 18]), pick([0, 30]), 0, 0);
      docs.push({ club: club._id, title: ev.name, description: ev.text, date, venue: pick(VENUES), type: EVENT_TYPE[club.category] || "social" });
    }
    const orientation = new Date(now + rand(1, 14) * DAY);
    orientation.setHours(pick([16, 17, 18]), 0, 0, 0);
    docs.push({
      club: club._id,
      title: `${club.shortName} Orientation for Freshers`,
      description: `Meet the ${club.shortName} team, see what we do and ask anything. Snacks on us!`,
      date: orientation,
      venue: pick(VENUES),
      type: "talk",
    });
  }
  await Event.insertMany(docs);
  console.log(`Events: ${docs.length}`);
}

async function seedFollowers(clubs, students) {
  if (await Club.exists({ "followers.0": { $exists: true } })) return;
  for (const club of clubs) {
    const followers = sample(students, rand(5, 40)).map((s) => s._id);
    await Club.updateOne({ _id: club._id }, { $addToSet: { followers: { $each: followers } } });
  }
  console.log("Followers: added");
}

async function writeCredentials(credentials) {
  const outDir = path.join(__dirname, "..", "output");
  await fs.mkdir(outDir, { recursive: true });
  const rows = [
    ...credentials.map((c) => ({
      role: c.role,
      club_name: c.club?.name || "",
      club_slug: c.club?.slug || "",
      admin_name: c.admin.fullname,
      email: c.admin.email,
      password: c.password,
      login_url: `${CLIENT_URL}/login`,
    })),
    // Only in demo mode: there is no such account after seed:clubs.
    ...(DEMO_MODE
      ? [{ role: "demo_student", club_name: "", club_slug: "", admin_name: "Aarav Sharma", email: DEMO_STUDENT.email, password: DEMO_STUDENT.password, login_url: `${CLIENT_URL}/login` }]
      : []),
  ];
  const cols = ["role", "club_name", "club_slug", "admin_name", "email", "password", "login_url"].map((k) => ({ label: k, get: (r) => r[k] }));
  const file = path.join(outDir, "club-admin-credentials.csv");
  await fs.writeFile(file, toCsv(rows, cols) + "\n");
  console.log(`Credentials: ${path.relative(process.cwd(), file)} (${rows.length} rows; keep it private)`);
}

async function main() {
  await connectDB();
  if (RESET) await resetCollections();
  await Promise.all([Club, User, Opening, Application, Event, Otp, ChatSession, ChatMessage].map((m) => m.syncIndexes()));

  const clubs = await seedClubs();
  const credentials = await seedAdmins(clubs);
  await writeCredentials(credentials);

  if (DEMO_MODE) {
    const adminsByClub = new Map(credentials.filter((c) => c.club).map((c) => [String(c.club._id), c.admin._id]));
    const students = await seedStudents();
    const openings = await seedOpenings(clubs, adminsByClub);
    await seedApplications(openings, students, new Map(clubs.map((c) => [String(c._id), c])));
    await seedEvents(clubs);
    await seedFollowers(clubs, students);
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
