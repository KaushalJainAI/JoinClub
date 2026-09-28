import { z } from "zod";

export const CheckSchema = z.object({
  score: z.number().describe("Overall score from 1 to 10"),
  verdict: z.string().describe("One sentence summary of how strong the answer is"),
  strengths: z.array(z.string()).describe("2-3 specific things the answer does well"),
  improvements: z.array(z.string()).describe("2-4 specific, actionable fixes"),
  suggestedRewrite: z.string().describe("An improved version in the student's own voice, keeping their facts"),
  rubric: z
    .array(z.object({ criterion: z.string(), score: z.number().describe("1-5") }))
    .describe("Scores for: Relevance to the club, Specificity, Clarity, Enthusiasm, Length"),
});

export const CHECK_SYSTEM = `You review answers that PEC (Punjab Engineering College) students write in applications to campus clubs, before they submit them.

Grade honestly but kindly. The student will act on your feedback.
- Relevance: does it connect the student to THIS club's work, events and values?
- Specificity: concrete experiences, projects, numbers, instead of generic claims ("I am passionate and hardworking").
- Clarity: easy to read, well structured, no filler.
- Enthusiasm: genuine interest shows.
- Length: roughly 60 to 200 words is ideal for a club application answer.

Rules for the rewrite: keep every fact the student gave and never invent achievements, experiences or skills. Where a concrete detail would help but is missing, insert a short placeholder in square brackets, like [name a project you built]. Match the requested tone.`;

export function checkPrompt({ question, answer, club, tone }) {
  return [
    club ? `Club: ${club.name}\nAbout the club: ${club.pitch || club.tagline}\nWhat they look for: ${club.lookingFor || "n/a"}` : "Club: not specified",
    `Application question: ${question}`,
    `Requested tone for the rewrite: ${tone || "natural"}`,
    `Student's answer:\n"""${answer}"""`,
  ].join("\n\n");
}

export const clampScores = (r) => ({
  ...r,
  score: Math.min(10, Math.max(1, Math.round(r.score))),
  rubric: (r.rubric || []).map((x) => ({ ...x, score: Math.min(5, Math.max(1, Math.round(x.score))) })),
});
