// Demo mode, used when ANTHROPIC_API_KEY is not set. It answers from the database
// with simple rules so every AI screen works end to end without spending money.
import { Club } from "../model/club.model.js";
import { relevantClubs, openingsDigest, userDigest } from "./context.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function* streamDemo(text, signal) {
  for (const piece of text.match(/\S+\s*/g) || []) {
    if (signal?.aborted) return;
    yield { type: "text", text: piece };
    await sleep(18);
  }
}

const INTEREST_TO_CATEGORY = [
  [/cod|tech|robot|build|engineer|hardware|ai|web|electr|mech|civil|aero|space|startup/i, "technical"],
  [/music|danc|drama|act|art|photo|film|design|bhangra|perform/i, "cultural"],
  [/writ|debat|speak|read|quiz|poet|journal|mun|media/i, "literary"],
  [/social|volunt|service|ngo|impact|ncc|nss|help|counsel|women/i, "social"],
  [/sport|fit|cricket|football|athlet|game|swim/i, "sports"],
];

const clubLine = (c) => `- **[${c.name}](/clubs/${c.slug})**: ${c.tagline}`;

export async function demoHelpdesk(message, userId) {
  const m = message.toLowerCase();

  if (/status|my application|applied/.test(m)) {
    return `Here's what I can see on your account:\n\n${await userDigest(userId)}\n\nYou can also check [My Applications](/applications) any time.`;
  }
  if (/recruit|open|deadline|apply now|hiring|closing/.test(m)) {
    return `These openings are accepting applications (soonest deadline first):\n\n${await openingsDigest(8)}\n\n[[options: Find a club for me | How does recruitment work?]]`;
  }
  if (/how (does|do).*(work|apply)|recruitment work|how to apply|process/.test(m)) {
    return [
      "Club recruitment on JoinClub works like this:",
      "1. **Browse** clubs and open positions. Each club page shows what they do and who they're looking for.",
      "2. **Apply** on the opening's page by answering the club's questions. Use the *Check my answer* button for AI feedback first.",
      "3. **Interview**: many clubs call shortlisted students for a chat or a test. Practise in the Mock Interview tab!",
      "4. **Track** your status (pending → shortlisted → accepted) under My Applications.",
      "",
      "[[options: Which clubs are recruiting now? | Find a club for me | Practise an interview]]",
    ].join("\n");
  }

  const category = INTEREST_TO_CATEGORY.find(([rx]) => rx.test(m))?.[1];
  if (category && /find|recommend|suggest|club for me|into|like|love|interested|&|tech|music|writ|social|sport/.test(m)) {
    const clubs = await Club.find({ category }).sort({ memberCount: -1 }).limit(4).lean();
    return `Great pick! Here are ${category} clubs students love:\n\n${clubs.map(clubLine).join("\n")}\n\nOpen any of them to see why members join, signature events and open positions.\n\n[[options: Which of these are recruiting? | Something else | How much time do clubs take?]]`;
  }
  if (/find|recommend|suggest|club for me|which club|what club/.test(m)) {
    return "Happy to help you find your people! What sounds most like you?\n\n[[options: Coding & tech | Music, dance & drama | Writing & debating | Social impact | Sports & fitness]]";
  }
  if (/time|commit|hours|busy/.test(m)) {
    return "Most clubs take **2 to 6 hours a week**, more around big events like PECFEST, and less during exams. Each club page shows a typical commitment. Technical teams building cars or robots (like SAE and Robotics) usually take the most time.";
  }

  const clubs = await relevantClubs(message, 2);
  if (clubs.length) {
    return clubs
      .map((c) => `**[${c.name}](/clubs/${c.slug})**: ${c.pitch}\n\nWhy students join:\n${(c.whyJoin || []).slice(0, 3).map((w) => `- **${w.title}**: ${w.text}`).join("\n")}`)
      .join("\n\n---\n\n");
  }
  return "I'm PEC Buddy. I can help you find a club, check who's recruiting, or track your applications. What would you like to do?\n\n[[options: Find a club for me | Which clubs are recruiting now? | What's the status of my applications?]]";
}

export const demoSuggestions = () => ["Which of these are recruiting?", "How do I prepare for interviews?", "How much time does it take?"];

export function demoCheck({ answer }) {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const specific = /\d|project|built|made|organi[sz]ed|led|won|competition|workshop|team/i.test(answer);
  const generic = (answer.match(/passionate|hardworking|dedicated|always wanted|love to/gi) || []).length;
  const length = words < 40 ? 2 : words > 250 ? 3 : 5;
  const specificity = specific ? 4 : 2;
  const clarity = /[.!?]/.test(answer) && words > 15 ? 4 : 2;
  const enthusiasm = /excite|love|can't wait|thrill|inspir|enjoy/i.test(answer) ? 4 : 3;
  const relevance = Math.max(2, 4 - generic);
  const rubric = [
    { criterion: "Relevance to the club", score: relevance },
    { criterion: "Specificity", score: specificity },
    { criterion: "Clarity", score: clarity },
    { criterion: "Enthusiasm", score: enthusiasm },
    { criterion: "Length", score: length },
  ];
  const score = Math.round((rubric.reduce((a, r) => a + r.score, 0) / 25) * 10);
  return {
    score,
    verdict: score >= 7 ? "A solid answer. A couple of tweaks will make it stand out." : "A good start, but it needs more concrete detail to stand out.",
    strengths: [words >= 40 ? "Enough length to show real thought." : "Short and to the point.", specific ? "Mentions concrete experience." : "Clear about wanting to join."],
    improvements: [
      !specific && "Add one concrete example: a project, event or moment that shows your interest.",
      generic && "Swap generic words like 'passionate' for something you actually did.",
      words < 40 && "Expand to around 80 to 150 words.",
      "Name something specific about this club (an event or activity) that you'd like to be part of.",
    ].filter(Boolean),
    suggestedRewrite: `${answer.trim()}\n\nFor example, [describe a project or experience related to this club], and I'd love to contribute to [name one of the club's events] because [your reason].`,
    rubric,
  };
}

const QUESTION_BANK = {
  hr: [
    "Why do you want to join this club, and why now?",
    "Tell me about a time you worked in a team that disagreed. What did you do?",
    "How will you balance club work with your academics during exams?",
    "What's something you taught yourself recently, and how did you go about it?",
    "Describe a time you took responsibility for something that went wrong.",
    "Where do you see yourself in this club by your final year?",
    "What would you do if you were given a task with a very tight deadline?",
    "What's one idea you'd bring to the club in your first semester?",
    "How do you handle feedback that you disagree with?",
    "Any questions for us?",
  ],
  technical: [
    "Walk me through a project you've built or would like to build in this field.",
    "Explain a technical concept from this club's domain as if I were a first-year.",
    "You're stuck on a problem for two days. What's your debugging process?",
    "What tools or technologies in this field are you most excited to learn?",
    "How would you approach designing a solution for this club's flagship competition?",
    "Tell me about a mistake you made while building something and what you learnt.",
    "How do you decide when something is 'good enough' to ship?",
    "What's a recent development in this field you find interesting?",
    "How would you split a large technical task among a team of four?",
    "What would you want to build here in your first year?",
  ],
};

export function demoInterviewReply(meta, lastAnswer) {
  const bank = meta.type === "technical" ? QUESTION_BANK.technical : meta.type === "hr" ? QUESTION_BANK.hr : QUESTION_BANK.hr.map((q, i) => (i % 2 ? QUESTION_BANK.technical[i] : q));
  const feedback = !lastAnswer
    ? `Hi! I'm a senior from ${meta.club.name}. Let's do a quick ${meta.difficulty} mock interview, and relax, it's practice.`
    : lastAnswer.split(/\s+/).length > 40
      ? "Good detail there. Next time, lead with your main point before the story."
      : "Thanks. Try adding a concrete example; it makes answers far more convincing.";
  if (meta.asked >= meta.total) return `${feedback}\n\nThat's the end of the interview. Thanks for practising! Your report card is below.`;
  return `${feedback}\n\n**Question ${meta.asked + 1} of ${meta.total}**\n\n${bank[meta.asked % bank.length]}`;
}

export const demoScore = (answer) => {
  const words = answer.trim().split(/\s+/).length;
  return { score: words > 60 ? 4 : words > 25 ? 3 : 2, note: words > 25 ? "Clear answer with some substance." : "Too brief. Add an example." };
};

export const demoReport = (meta) => {
  const avg = meta.scores.length ? meta.scores.reduce((a, s) => a + s.score, 0) / meta.scores.length : 3;
  return {
    overall: Math.round(avg * 2),
    headline: avg >= 3.5 ? "Strong practice run. You come across as prepared and genuine." : "Good first run. More concrete examples will lift your answers a lot.",
    strengths: ["You answered every question.", "Your interest in the club comes through.", "You stayed on topic."],
    improvements: ["Use the STAR format (Situation, Task, Action, Result) for experience questions.", "Add one concrete example per answer.", `Read up on ${meta.club.name}'s signature events before the real interview.`],
    resources: [`Read ${meta.club.name}'s page on JoinClub: why members join and their events.`, "Practise out loud once more tomorrow with a friend.", "Prepare two questions to ask the interviewers."],
  };
};
