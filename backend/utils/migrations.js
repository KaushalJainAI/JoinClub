// Small, idempotent data fixes that run at startup, for fields added after data existed.
import { Club } from "../model/club.model.js";

// Club.followerCount mirrors followers.length. Clubs saved before the field existed have
// none, and a count of "missing" would show as zero followers.
export async function backfillFollowerCounts() {
  const res = await Club.updateMany({ followerCount: { $exists: false } }, [
    { $set: { followerCount: { $size: { $ifNull: ["$followers", []] } } } },
  ]);
  if (res.modifiedCount) console.log(`Backfilled followerCount on ${res.modifiedCount} clubs`);
}
