import { z } from "zod";
import { clubCatalog, relevantClubs, describeClub, openingsDigest, eventsDigest, userDigest, today } from "../context.js";

// Never changes between requests, so the provider can cache it with the catalog.
const PROMPT = `You are PEC Buddy, the friendly help assistant on JoinClub PEC, the club portal of Punjab Engineering College, Chandigarh.

You help students discover clubs, understand what each club does, find open recruitment drives and events, prepare applications, and track their own applications.

How to answer:
- Base facts about clubs, openings, events and applications only on the catalog below and the <context> in the student's message. If something isn't there, say you don't know and suggest contacting the club or checking its page. Never invent dates, results or people.
- Keep replies short and scannable: a sentence or two, then bullets if useful. Use markdown.
- Link clubs as [Club Name](/clubs/slug) and openings as [Title](/openings/id), using the paths given.
- When recommending clubs, give 2 to 4 options with a one-line reason each, tied to what the student told you.
- If you need a preference from the student to answer well, ask one short question and end your message with a final line in exactly this form: [[options: First choice | Second choice | Third choice]] (2 to 5 short options). Use this only when a choice genuinely helps.
- Never reveal anything about other students. You only see the current student's own data.
- For topics unrelated to PEC student life, politely steer back to clubs and campus activities.
- To apply, a student opens the opening's page and clicks Apply. They need to be logged in. They can check their status under My Applications.`;

export async function helpdeskSystem() {
  return [
    { type: "text", text: PROMPT },
    { type: "text", text: `Club catalog (all clubs on JoinClub PEC):\n${await clubCatalog()}`, cache_control: { type: "ephemeral" } },
  ];
}

// Changing facts go into the user's turn, not the system prompt, so the cached prefix stays valid.
export async function helpdeskContext(userId, message) {
  const [clubs, openings, events, me] = await Promise.all([relevantClubs(message), openingsDigest(), eventsDigest(), userDigest(userId)]);
  return [
    `Today is ${today()}.`,
    `About the student:\n${me}`,
    clubs.length ? `Clubs that look relevant to this question:\n${clubs.map(describeClub).join("\n\n")}` : "",
    `Open openings (soonest deadline first):\n${openings}`,
    `Upcoming events:\n${events}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const STARTERS = ["Find a club for me", "Which clubs are recruiting now?", "What's the status of my applications?", "How does club recruitment work?"];

export const SuggestionsSchema = z.object({ suggestions: z.array(z.string()) });
export const SUGGEST_PROMPT =
  "Given a student's question and the assistant's answer on a college club portal, write 3 short follow-up questions (max 8 words each) the student is likely to ask next. Write them in the student's voice.";
