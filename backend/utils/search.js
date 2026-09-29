// Search input for MongoDB's $text operator, plus the prefix match that covers what $text
// cannot. $text matches whole (stemmed) words, so "robo" would not find "Robotics";
// callers run both and merge the ids.
import { escapeRegex } from "./http.js";

// $text gives quotes and a leading "-" special meaning (phrase, exclusion). A student
// typing them means the characters, so they are dropped.
export const cleanTerm = (q = "") =>
  String(q)
    .replace(/["\\]/g, " ")
    .replace(/(^|\s)-+/g, "$1")
    .trim()
    .slice(0, 80);

// Matches the start of any word: "mus" finds "Music Club", "club" finds "Music Club".
export const wordPrefix = (term) => new RegExp(`(^|[\\s-])${escapeRegex(term)}`, "i");

// Ids matching `base` by $text or by a word prefix in any of `prefixFields`.
export async function searchIds(Model, base, q, prefixFields) {
  const term = cleanTerm(q);
  if (!term) return null; // no search: the caller keeps its own filter
  const rx = wordPrefix(term);
  const [byText, byPrefix] = await Promise.all([
    Model.find({ ...base, $text: { $search: term } }).select("_id").lean(),
    Model.find({ ...base, $or: prefixFields.map((f) => ({ [f]: rx })) }).select("_id").lean(),
  ]);
  return [...new Set([...byText, ...byPrefix].map((d) => String(d._id)))];
}
