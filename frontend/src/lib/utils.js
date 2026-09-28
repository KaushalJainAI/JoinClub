import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const initials = (name = "") =>
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
