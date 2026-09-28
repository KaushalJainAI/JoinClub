import crypto from "crypto";

// 12 characters from an alphabet without look-alikes (0/O, 1/l/I), guaranteed to
// contain a lowercase letter, an uppercase letter and a digit.
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGIT = "23456789";
const ALL = LOWER + UPPER + DIGIT;

const pick = (set) => set[crypto.randomInt(set.length)];

export function generatePassword(length = 12) {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGIT)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
