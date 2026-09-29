import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * A Cloudinary image at the size it is shown, in the best format the browser supports.
 * `width` is the CSS width; twice that is requested so screens with 2x pixels stay sharp,
 * but never more than the 1600 px the server keeps (a bigger `w_` would upscale).
 * URLs that aren't Cloudinary's (pec.ac.in, DiceBear) are returned unchanged, as are ones
 * that already carry a transformation.
 */
export function cdnImg(url, width) {
  if (!url || !width || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  const [head, tail] = url.split("/image/upload/");
  // A transformation is a path segment like "w_200,c_fill"; a version is "v1712345".
  if (/^[a-z]{1,3}_[^/]*\//.test(tail)) return url;
  return `${head}/image/upload/f_auto,q_auto,w_${Math.min(1600, Math.round(width * 2))}/${tail}`;
}

export const initials =(name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

export const formatDate = (d, opts = {}) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata", ...opts }) : "";

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";

// "3 days left", "Closes today", "Closed"
export function timeLeft(deadline) {
  const ms = new Date(deadline) - Date.now();
  if (ms <= 0) return { label: "Closed", urgent: false, closed: true };
  const hours = ms / 3_600_000;
  if (hours < 24) return { label: hours < 1 ? "Closes within the hour" : `${Math.ceil(hours)}h left`, urgent: true, closed: false };
  const days = Math.ceil(hours / 24);
  return { label: `${days} day${days === 1 ? "" : "s"} left`, urgent: days <= 3, closed: false };
}

export const relativeTime = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(d);
};

// For <input type="date">: YYYY-MM-DD in India time.
export const toDateInput = (d) => (d ? new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "");

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
