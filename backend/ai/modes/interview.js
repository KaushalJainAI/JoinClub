import { z } from "zod";

export const INTERVIEW_TYPES = {
  hr: "HR / behavioural: motivation, teamwork, time management, handling conflict",
  technical: "Technical: fundamentals and hands-on problem solving in the club's domain",
  mixed: "Mixed: alternate between behavioural and domain questions",
};
export const DIFFICULTIES = ["easy", "medium", "hard"];

// The server tracks progress in session.meta; the model only ever gets one step at a time.
// A single block with a cache breakpoint: the prompt is fixed for the whole interview.
export const interviewSystem = (meta) => [{ type: "text", text: interviewPrompt(meta), cache_control: { type: "ephemeral" } }];

function interviewPrompt(meta) {
  return `You are a friendly but sharp senior member of ${meta.club.name} at Punjab Engineering College, conducting a mock recruitment interview to help a student practise.

Club: ${meta.club.name}. ${meta.club.pitch || meta.club.tagline || ""}
Role / opening: ${meta.role || "general member"}
Interview style: ${INTERVIEW_TYPES[meta.type] || INTERVIEW_TYPES.mixed}
Difficulty: ${meta.difficulty}
Total questions: ${meta.total}

Rules:
- Ask exactly ONE question per message, and label it "**Question N of ${meta.total}**".
- Keep your own messages short: at most 2 sentences of feedback, then the next question.
- Feedback should be specific and encouraging: name one good thing and one thing to sharpen.
- Tailor questions to this club's real activities and to what the student has said so far. Avoid repeating a topic.
- If the student asks to skip, move on. If they ask for a hint, give a small one.
- Follow the <interviewer_step> instruction in each student message exactly.`;
}

export const stepInstruction = (meta) => {
  if (meta.asked === 0) return `Greet the student in one sentence, then ask Question 1 of ${meta.total}.`;
  if (meta.asked < meta.total) return `Give brief feedback on the answer above, then ask Question ${meta.asked + 1} of ${meta.total}.`;
  return "That was the final answer. Give brief feedback on it, then thank the student and tell them their report card is ready below. Do not ask another question.";
};

export const AnswerScoreSchema = z.object({
  score: z.number().describe("1 (weak) to 5 (excellent)"),
  note: z.string().describe("One short sentence on the answer's main strength or gap"),
});
export const SCORE_SYSTEM =
  "You score one answer from a student's mock club-recruitment interview. Score 1-5 for relevance, depth, structure and honesty. Be fair to beginners: a clear, honest answer with some substance is a 3.";

export const ReportSchema = z.object({
  overall: z.number().describe("Overall score 1-10"),
  headline: z.string().describe("One encouraging sentence summarising the performance"),
  strengths: z.array(z.string()).describe("Top 3 strengths, specific to what the student said"),
  improvements: z.array(z.string()).describe("Top 3 things to work on, each actionable"),
  resources: z.array(z.string()).describe("2-3 concrete ways to prepare before the real interview"),
});
export const REPORT_SYSTEM =
  "You write the report card for a student's mock club-recruitment interview at Punjab Engineering College. Be specific, honest and encouraging. Refer to what the student actually said.";

export const clampReport = (r) => ({ ...r, overall: Math.min(10, Math.max(1, Math.round(r.overall))) });
