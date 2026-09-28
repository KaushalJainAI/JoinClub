import { z } from "zod";
import { ChatSession, ChatMessage } from "../model/chat.model.js";
import { Club } from "../model/club.model.js";
import { Opening } from "../model/opening.model.js";
import { Application } from "../model/application.model.js";
import { HttpError } from "../utils/http.js";
import { aiEnabled, MODEL, SMALL_MODEL, streamText, generateJSON, friendlyAiError, withUsageContext } from "../ai/llm.js";
import { openSse, extractOptions } from "../ai/sse.js";
import { helpdeskSystem, helpdeskContext, STARTERS, SuggestionsSchema, SUGGEST_PROMPT } from "../ai/modes/helpdesk.js";
import { CheckSchema, CHECK_SYSTEM, checkPrompt, clampScores } from "../ai/modes/checker.js";
import {
  interviewSystem,
  stepInstruction,
  AnswerScoreSchema,
  SCORE_SYSTEM,
  ReportSchema,
  REPORT_SYSTEM,
  clampReport,
} from "../ai/modes/interview.js";
import { streamDemo, demoHelpdesk, demoSuggestions, demoCheck, demoInterviewReply, demoScore, demoReport } from "../ai/demo.js";
import { assertOwnsClub } from "./club.controller.js";

const HISTORY_LIMIT = 12;
// Guest context is whatever the browser sent. Only public club data is in it, but it is
// still untrusted, so it is short and stripped of the model's own option markers.
const GUEST_HISTORY_TURNS = 6;
const OPTIONS_MARKER_RE = /\[\[\s*options\s*:[^\]]*\]\]/gi;

export const aiStatus = (req, res) => {
  res.json({ success: true, enabled: aiEnabled(), model: aiEnabled() ? MODEL : "demo", starters: STARTERS });
};

// ---------- sessions ----------

export const listSessions = async (req, res) => {
  const filter = { user: req.id };
  if (req.query.mode) filter.mode = req.query.mode;
  const sessions = await ChatSession.find(filter).sort({ updatedAt: -1 }).limit(30).select("title mode updatedAt meta.done meta.club.name").lean();
  res.json({ success: true, sessions });
};

export const getSession = async (req, res) => {
  const session = await ChatSession.findOne({ _id: req.params.id, user: req.id }).lean();
  if (!session) throw new HttpError(404, "Chat not found.");
  const messages = await ChatMessage.find({ session: session._id }).sort({ createdAt: 1 }).lean();
  res.json({ success: true, session, messages });
};

export const deleteSession = async (req, res) => {
  const session = await ChatSession.findOneAndDelete({ _id: req.params.id, user: req.id });
  if (!session) throw new HttpError(404, "Chat not found.");
  await ChatMessage.deleteMany({ session: session._id });
  res.json({ success: true, message: "Chat deleted." });
};

// ---------- chat (SSE) ----------

async function buildInterviewMeta(setup = {}) {
  const club = await Club.findOne({ slug: setup.clubSlug }).select("name shortName slug pitch tagline color logo").lean();
  if (!club) throw new HttpError(400, "Pick a club to interview for.");
  let role = "General member";
  if (setup.openingId) {
    const opening = await Opening.findOne({ _id: setup.openingId, club: club._id }).select("title").lean();
    if (opening) role = opening.title;
  }
  return {
    club,
    role,
    type: ["hr", "technical", "mixed"].includes(setup.type) ? setup.type : "mixed",
    difficulty: ["easy", "medium", "hard"].includes(setup.difficulty) ? setup.difficulty : "medium",
    total: [3, 5, 8, 10].includes(Number(setup.total)) ? Number(setup.total) : 5,
    asked: 0,
    scores: [],
    done: false,
  };
}

const toApiMessages = (rows) => {
  const msgs = rows.filter((m) => m.content?.trim()).map((m) => ({ role: m.role, content: m.content }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift(); // the API needs a user turn first
  return msgs;
};

/**
 * The messages to send to the model for a turn.
 *
 * An interview is bounded by `total` questions, so its whole transcript is loaded: the
 * model needs every earlier answer to avoid repeating topics, and the final report quotes
 * question 1. The helpdesk is unbounded in length, so it only gets recent turns.
 */
export async function loadHistory(sessionId, mode) {
  if (mode === "interview") return ChatMessage.find({ session: sessionId }).sort({ createdAt: 1 }).lean();
  return (await ChatMessage.find({ session: sessionId }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT).lean()).reverse();
}

// Streams text to the browser and returns the full text.
async function pipe(send, iterator) {
  let full = "";
  for await (const chunk of iterator) {
    full += chunk.text;
    send("content_chunk", { text: chunk.text });
  }
  return full;
}

async function suggestFollowUps(question, answer) {
  if (!aiEnabled()) return demoSuggestions();
  try {
    const { suggestions } = await withUsageContext({ feature: "suggestions" }, () =>
      generateJSON({
        model: SMALL_MODEL,
        system: SUGGEST_PROMPT,
        messages: [{ role: "user", content: `Student asked: ${question}\n\nAssistant answered: ${answer.slice(0, 3000)}` }],
        schema: SuggestionsSchema,
        maxTokens: 1024,
      })
    );
    return suggestions.slice(0, 3);
  } catch (err) {
    console.warn("[ai] follow-up suggestions failed:", err.message);
    return [];
  }
}

async function runHelpdesk({ send, message, prior, userId, signal }) {
  send("status", { stage: "thinking" });
  let text;
  if (aiEnabled()) {
    const context = await helpdeskContext(userId, message);
    const messages = [...toApiMessages(prior), { role: "user", content: `<context>\n${context}\n</context>\n\n${message}` }];
    text = await pipe(send, streamText({ system: await helpdeskSystem(), messages, effort: "medium", signal }));
  } else {
    text = await pipe(send, streamDemo(await demoHelpdesk(message, userId), signal));
  }
  const { content, options } = extractOptions(text);
  const suggestions = options.length ? [] : await suggestFollowUps(message, content);
  return { content, options, suggestions };
}

async function runInterview({ send, session, message, prior, signal }) {
  const meta = session.meta;
  const answer = message.trim();

  if (meta.asked > 0 && answer) {
    send("status", { stage: "scoring" });
    const lastQuestion = [...prior].reverse().find((m) => m.role === "assistant")?.content || "";
    let scored;
    try {
      scored = aiEnabled()
        ? await withUsageContext({ feature: "interview-score" }, () =>
            generateJSON({
              model: SMALL_MODEL,
              system: SCORE_SYSTEM,
              messages: [{ role: "user", content: `Difficulty: ${meta.difficulty}\n\nQuestion:\n${lastQuestion}\n\nAnswer:\n${answer}` }],
              schema: AnswerScoreSchema,
              maxTokens: 1024,
            })
          )
        : demoScore(answer);
    } catch (err) {
      console.warn("[ai] answer scoring failed:", err.message);
      scored = { score: 3, note: "" };
    }
    meta.scores.push({ question: meta.asked, score: Math.min(5, Math.max(1, Math.round(scored.score))), note: scored.note });
  }

  send("status", { stage: "thinking" });
  let content;
  if (aiEnabled()) {
    const step = `<interviewer_step>${stepInstruction(meta)}</interviewer_step>`;
    const messages = [...toApiMessages(prior), { role: "user", content: answer ? `${answer}\n\n${step}` : step }];
    content = await pipe(send, streamText({ system: interviewSystem(meta), messages, effort: "medium", signal }));
  } else {
    content = await pipe(send, streamDemo(demoInterviewReply(meta, answer), signal));
  }

  let report = null;
  if (meta.asked < meta.total) {
    meta.asked += 1;
  } else {
    send("status", { stage: "report" });
    const transcript = [...prior, { role: "user", content: answer }]
      .map((m) => `${m.role === "user" ? "Student" : "Interviewer"}: ${m.content}`)
      .join("\n\n");
    report = aiEnabled()
      ? clampReport(
          await generateJSON({
            system: REPORT_SYSTEM,
            messages: [{ role: "user", content: `Club: ${meta.club.name} · Role: ${meta.role} · Type: ${meta.type} · Difficulty: ${meta.difficulty}\nPer-answer scores (1-5): ${JSON.stringify(meta.scores)}\n\nTranscript:\n${transcript}` }],
            schema: ReportSchema,
            effort: "medium",
          })
        )
      : demoReport(meta);
    meta.done = true;
    meta.report = report;
  }
  session.markModified("meta");
  return { content, options: [], suggestions: [], report };
}

export const chat = async (req, res) => {
  const { mode = "helpdesk", sessionId, setup } = req.body;
  const message = String(req.body.message || "").slice(0, 4000);

  if (!["helpdesk", "interview"].includes(mode)) throw new HttpError(400, "Unknown chat mode.");
  if (mode === "interview" && !req.id) throw new HttpError(401, "Log in to practise interviews.");

  // Guests get a stateless helpdesk; history comes from the browser.
  let session = null;
  let prior = [];
  if (req.id) {
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, user: req.id });
      if (!session) throw new HttpError(404, "Chat not found.");
      if (session.mode !== mode) throw new HttpError(400, "That chat belongs to a different assistant.");
      // An interview is bounded by `total` questions, so the whole transcript is loaded:
      // the model needs every earlier answer to avoid repeating topics, and the final
      // report must quote question 1. The helpdesk only needs recent turns.
      prior = await loadHistory(session._id, mode);
    } else {
      const meta = mode === "interview" ? await buildInterviewMeta(setup) : {};
      const title = mode === "interview" ? `${meta.club.shortName || meta.club.name} · ${meta.type.toUpperCase()} interview` : message.slice(0, 60) || "New chat";
      session = await ChatSession.create({ user: req.id, mode, title, meta });
    }
  } else {
    // Guest history: capped, and the browser cannot put [[options: ...]] markers into an
    // assistant turn to make the model offer choices it never made.
    prior = (Array.isArray(req.body.history) ? req.body.history : [])
      .slice(-GUEST_HISTORY_TURNS)
      .filter((m) => ["user", "assistant"].includes(m?.role) && typeof m.content === "string")
      .map((m) => ({
        role: m.role,
        content: (m.role === "assistant" ? m.content.replace(OPTIONS_MARKER_RE, "") : m.content).slice(0, 4000),
      }))
      .filter((m) => m.content.trim());
  }

  if (mode === "helpdesk" && !message.trim()) throw new HttpError(400, "Type a message first.");
  if (mode === "interview" && session.meta.done) throw new HttpError(400, "This interview is finished. Start a new one to practise again.");
  if (mode === "interview" && session.meta.asked > 0 && !message.trim()) throw new HttpError(400, "Type your answer first.");

  const send = openSse(res);
  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) abort.abort();
  });
  if (session) send("session", { sessionId: session._id, title: session.title, meta: mode === "interview" ? session.meta : undefined });

  // Saved only once the model has answered. Saving it first (as this used to) left the
  // student's question in the transcript with no reply when the call failed, and a retry
  // then stored the same question twice.
  let pendingUserMessage = null;

  try {
    const result = await withUsageContext({ user: req.id, feature: mode }, () =>
      mode === "helpdesk"
        ? runHelpdesk({ send, message, prior, userId: req.id, signal: abort.signal })
        : runInterview({ send, session, message, prior, signal: abort.signal })
    );

    let saved = null;
    if (session) {
      if (message.trim()) pendingUserMessage = await ChatMessage.create({ session: session._id, role: "user", content: message });
      saved = await ChatMessage.create({ session: session._id, role: "assistant", content: result.content, options: result.options, suggestions: result.suggestions });
      await session.save(); // bumps updatedAt, persists interview meta
    }
    if (result.options.length) send("options", { options: result.options });
    if (result.suggestions.length) send("suggestions", { suggestions: result.suggestions });
    if (result.report) send("report", { report: result.report });
    send("done", {
      messageId: saved?._id,
      content: result.content,
      meta: mode === "interview" ? { asked: session.meta.asked, total: session.meta.total, done: session.meta.done } : undefined,
    });
  } catch (err) {
    // The question never reached the model, so it never got an answer: drop it rather than
    // leave a question in the transcript that the assistant did not respond to.
    if (pendingUserMessage) await ChatMessage.deleteOne({ _id: pendingUserMessage._id }).catch(() => {});
    const msg = friendlyAiError(err);
    if (msg) {
      console.error("[ai] chat failed:", err);
      send("error", { message: msg });
    }
  } finally {
    res.end();
  }
};

// ---------- answer checker ----------

export const checkAnswerSchema = z.object({
  question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(10, "Write at least a sentence first").max(4000),
  clubSlug: z.string().optional(),
  openingId: z.string().optional(),
  tone: z.enum(["formal", "friendly", "concise", "natural"]).optional(),
});

export const checkAnswer = async (req, res) => {
  const { question, answer, clubSlug, openingId, tone } = req.body;
  let club = null;
  if (openingId) {
    const opening = await Opening.findById(openingId).select("club").lean();
    if (opening) club = await Club.findById(opening.club).select("name tagline pitch lookingFor").lean();
  } else if (clubSlug) {
    club = await Club.findOne({ slug: clubSlug }).select("name tagline pitch lookingFor").lean();
  }

  if (!aiEnabled()) return res.json({ success: true, demo: true, result: demoCheck({ answer }) });
  try {
    const result = await withUsageContext({ user: req.id, feature: "checker" }, () =>
      generateJSON({
        system: CHECK_SYSTEM,
        messages: [{ role: "user", content: checkPrompt({ question, answer, club, tone }) }],
        schema: CheckSchema,
        effort: "medium",
      })
    );
    res.json({ success: true, result: clampScores(result) });
  } catch (err) {
    console.error("[ai] check failed:", err);
    throw new HttpError(502, friendlyAiError(err) || "The checker couldn't finish. Try again.");
  }
};

// ---------- applicant summary for club admins ----------

const ApplicantSummarySchema = z.object({
  summary: z.string().describe("Two sentences on who this applicant is and what they bring"),
  highlights: z.array(z.string()).describe("Up to 3 standout points from their answers/profile"),
  questionsToAsk: z.array(z.string()).describe("2 good follow-up questions for their interview"),
});

export const applicantSummary = async (req, res) => {
  const app = await Application.findById(req.params.id).populate("applicant", "fullname profile").populate("opening", "title").lean();
  if (!app) throw new HttpError(404, "Application not found.");
  assertOwnsClub(req, app.club);

  // A student can opt out of having their answers summarised for club admins.
  if (app.applicant && app.applicant.aiApplicantSummary === false) {
    return res.json({
      success: true,
      optedOut: true,
      message: `${app.applicant.fullname} has opted out of AI summaries. Read their answers below.`,
    });
  }

  const p = app.applicant?.profile || {};
  const profile = `Branch: ${p.branch || "?"}, year ${p.year || "?"}. Skills: ${(p.skills || []).join(", ") || "none listed"}. Bio: ${p.bio || "none"}`;
  const answers = app.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");

  if (!aiEnabled()) {
    const longest = [...app.answers].sort((a, b) => b.answer.length - a.answer.length)[0];
    return res.json({
      success: true,
      demo: true,
      result: {
        summary: `${app.applicant?.fullname} (${p.branch || "branch n/a"}, year ${p.year || "?"}) applied for ${app.opening?.title}.`,
        highlights: [(p.skills || []).length ? `Skills: ${p.skills.slice(0, 4).join(", ")}` : "No skills listed", longest ? `Most detailed answer: "${longest.answer.slice(0, 120)}…"` : "No answers"].filter(Boolean),
        questionsToAsk: ["Can you tell us more about a project you're proud of?", "How much time can you give the club each week?"],
      },
    });
  }
  const result = await withUsageContext({ user: req.id, feature: "applicant-summary" }, () =>
    generateJSON({
      system: "You help student club leads at Punjab Engineering College review applications quickly and fairly. Summarise only what the applicant wrote. Do not judge on name, gender or background, and never invent details.",
      messages: [{ role: "user", content: `Opening: ${app.opening?.title}\nApplicant profile: ${profile}\n\nAnswers:\n${answers}` }],
      schema: ApplicantSummarySchema,
      effort: "low",
    })
  );
  res.json({ success: true, result });
};
