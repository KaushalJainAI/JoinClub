// Guards for the seed script, kept apart so `seed:clubs` and `seed:demo` can have
// different rules: clubs and admin accounts belong in production, dummy students never do.
import readline from "readline/promises";
import { stdin, stdout } from "process";

// Everything the script is about to touch, for the confirmation prompt.
export const SEEDED_MODELS = ["clubs", "club admins", "the super admin"];

const isLocalUri = (uri = "") => /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\]|\[::ffff:127\.0\.0\.1\])[:/]/.test(uri);
const hostOf = (uri = "") => uri.replace(/^mongodb(\+srv)?:\/\//, "").split("/")[0].split("@").pop() || uri;

/** The database the seed would write to, so the prompt can name it. */
export function targetDatabase() {
  return process.env.MONGO_DB || "joinclub (from MONGO_URI)";
}

/** NODE_ENV=production or a non-local MONGO_URI: a real database. */
export function isRealDatabase() {
  return process.env.NODE_ENV === "production" || !isLocalUri(process.env.MONGO_URI || "");
}

/**
 * Refuses to run against a real database unless --allow-remote is passed, and refuses
 * --reset entirely unless the database name is typed out.
 */
export async function guardSeed({ reset, allowRemote, withDemoData }) {
  if (!isRealDatabase()) return;

  const reason = [process.env.NODE_ENV === "production" ? "NODE_ENV=production" : null, `MONGO_URI points at ${hostOf(process.env.MONGO_URI || "")}`]
    .filter(Boolean)
    .join(" and ");

  if (!allowRemote) {
    console.error(
      `Refusing to seed: ${reason}.\n` +
        "This database may hold real students, applications and club accounts.\n" +
        (withDemoData
          ? "The demo data adds ~150 fake students and a login with a published password, and --reset wipes every collection.\n"
          : "") +
        "If you really mean it, re-run with --allow-remote."
    );
    process.exit(1);
  }

  console.warn(`Warning: seeding a real database (${reason}).`);

  if (reset) {
    const db = targetDatabase();
    const answer = await readline.createInterface({ input: stdin, output: stdout }).question(
      `\n--reset DELETES every club, account, opening, application and chat in "${db}".\n` +
        `Type the database name exactly to continue: `
    );
    // A closed stdin (CI, no TTY) answers null, which is not the database name.
    if (answer?.trim() !== db) {
      console.error("Names did not match. Nothing was deleted.");
      process.exit(1);
    }
  }
}
