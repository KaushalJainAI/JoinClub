// Small helpers shared by every controller.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wraps an async route handler so a thrown error reaches the error middleware
// instead of leaving the request hanging.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const toCsv = (rows, columns) => {
  const cell = (v) => {
    let s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    // Spreadsheet apps run cells starting with these as formulas; a leading ' makes them text.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map((c) => cell(c.label)).join(","), ...rows.map((r) => columns.map((c) => cell(c.get(r))).join(","))].join("\n");
};
