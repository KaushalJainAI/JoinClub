// One source of truth for who administers a club: `User.club`.
//
// `Club.admins[]` exists so the club page and the super-admin list can populate admins in
// one query, so it is kept in sync here and nowhere else. Every write that changes
// `User.club`, or a user's role, goes through these helpers.
import { Club } from "../model/club.model.js";
import { User } from "../model/user.model.js";

/** Re-derives Club.admins from User.club for the clubs involved. */
export async function syncClubAdmins(clubIds) {
  const ids = [...new Set([].concat(clubIds).filter(Boolean).map(String))];
  if (!ids.length) return;
  const admins = await User.find({ club: { $in: ids }, role: "club_admin", active: { $ne: false } }).select("_id club").lean();
  await Promise.all(
    ids.map((id) =>
      Club.updateOne(
        { _id: id },
        { $set: { admins: admins.filter((a) => String(a.club) === id).map((a) => a._id) } }
      )
    )
  );
}

/**
 * Points an account at a club (or clears it with `null`) and re-derives both clubs' admin
 * lists. Bumps `tokenVersion` when the club changes, so sessions opened before the
 * handover stop working.
 */
export async function setUserClub(user, clubId) {
  const previous = user.club ? String(user.club) : null;
  user.club = clubId;
  if (previous !== (clubId ? String(clubId) : null)) user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await syncClubAdmins([previous, clubId]);
}

/** Marks an account inactive and drops it from its club's admin list. */
export async function setUserActive(user, active) {
  const previous = user.club ? String(user.club) : null;
  user.active = active;
  // Signing out is the point of deactivating, so old cookies stop working.
  if (!active) user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await syncClubAdmins([previous]);
}
