// Where each role lands after logging in.
export const homeFor = (user) => (user?.role === "club_admin" ? "/admin" : user?.role === "super_admin" ? "/super" : "/");

// Only same-site paths are accepted as a post-login destination.
export const safeNext = (next) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

// Mirrors the backend's password rule, for inline hints.
export function passwordProblems(pw) {
  const issues = [];
  if (pw.length < 8) issues.push("8+ characters");
  if (!/[A-Za-z]/.test(pw)) issues.push("a letter");
  if (!/\d/.test(pw)) issues.push("a number");
  return issues;
}

export const BRANCHES = [
  "Computer Science",
  "Data Science",
  "Electronics & Communication",
  "VLSI",
  "Electrical",
  "Mechanical",
  "Civil",
  "Aerospace",
  "Production & Industrial",
  "Metallurgy & Materials",
];
