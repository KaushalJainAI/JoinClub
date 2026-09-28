// One place for the campus timezone.
//
// The server runs in UTC on Render/Railway, so anything a student reads as "today" or
// "the deadline" has to be worked out in India, not on the server. Getting this wrong
// hides an event that starts at 09:00 IST behind a UTC-midnight cut-off.
export const TZ = "Asia/Kolkata";

/** YYYY-MM-DD for a moment, as seen in India. */
export const istDateKey = (date = new Date()) => new Date(date).toLocaleDateString("en-CA", { timeZone: TZ });

/** The instant 00:00 IST on the day `date` falls in. */
export const startOfIstDay = (date = new Date()) => {
  // en-GB gives DD/MM/YYYY; build an unambiguous local-time string and parse it as IST.
  const [day, month, year] = new Date(date).toLocaleDateString("en-GB", { timeZone: TZ }).split("/");
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
};

/** The instant 23:59:59 IST on the day `date` falls in. */
export const endOfIstDay = (date = new Date()) => new Date(`${istDateKey(date)}T23:59:59+05:30`);

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * For a zod preprocess, so a date from an `<input type="date">` means the whole day in
 * India. `z.coerce.date()` on its own reads "2026-10-05" as midnight UTC, which closes an
 * opening at 05:30 IST on the 5th instead of the end of that day.
 */
export const istDayEnd = (value) => (typeof value === "string" && DATE_ONLY.test(value.trim()) ? endOfIstDay(value) : value);
