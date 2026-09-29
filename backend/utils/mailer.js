import nodemailer from "nodemailer";

// Without SMTP settings (local dev), mail is printed to the console instead of sent.
let transporter = null;
const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!transporter && smtpConfigured()) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

// Sends and reports. Failures are recorded, because during a recruitment week a silently
// dropped OTP means a student who simply cannot sign in, and nothing else would show it.
const failures = [];

export const mailFailures = () => failures.slice(-50);

async function recordFailure(to, subject, err) {
  const entry = { to, subject, at: new Date().toISOString(), message: err?.message || String(err) };
  failures.push(entry);
  if (failures.length > 200) failures.shift();
  console.error(`[mail] failed to send "${subject}" to ${to}: ${entry.message}`);
  // Best effort: a failed send must not turn into a failed request.
  try {
    const { MailFailure } = await import("../model/mailFailure.model.js");
    await MailFailure.create({ ...entry, at: new Date() });
  } catch {
    /* no database, or the model is not loaded: the log line above is the record */
  }
}

export async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n[mail:dev] ${text}\n`);
    return { dev: true };
  }
  try {
    return await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
  } catch (err) {
    await recordFailure(to, subject, err);
    throw err;
  }
}

const PURPOSE_COPY = {
  reset_password: "reset your JoinClub PEC password",
  change_password: "change your JoinClub PEC password",
  verify_email: "verify your email for JoinClub PEC",
};

export function otpEmail(code, purpose, minutes) {
  const action = PURPOSE_COPY[purpose] || "continue";
  const text = `Your code to ${action} is ${code}. It expires in ${minutes} minutes. If you didn't ask for this, you can ignore this email.`;
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px">
    <h2 style="margin:0 0 8px;color:#0b2a5b">JoinClub <span style="color:#c2410c">PEC</span></h2>
    <p style="color:#374151">Use this code to ${action}:</p>
    <p style="font-size:32px;letter-spacing:10px;font-weight:700;color:#0b2a5b;margin:16px 0">${code}</p>
    <p style="color:#6b7280;font-size:14px">It expires in ${minutes} minutes. If you didn't ask for this, you can safely ignore this email.</p>
  </div>`;
  return { subject: `${code} is your JoinClub PEC code`, html, text };
}

const escapeHtml = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const STATUS_COPY = {
  shortlisted: {
    subject: (club) => `You're shortlisted by ${club}!`,
    lead: (club, opening) => `Good news: ${club} has shortlisted you for <strong>${opening}</strong>.`,
    next: "Expect them to reach out about an interview. You can practise with the mock interview on JoinClub.",
  },
  accepted: {
    subject: (club) => `Welcome to ${club} 🎉`,
    lead: (club, opening) => `Congratulations! ${club} has accepted your application for <strong>${opening}</strong>.`,
    next: "The club will be in touch with next steps.",
  },
  rejected: {
    subject: (club) => `An update on your ${club} application`,
    lead: (club, opening) => `Thank you for applying to ${club} for <strong>${opening}</strong>. They weren't able to offer you a spot this time.`,
    next: "Plenty of other clubs are recruiting. Follow the ones you like to hear when they open.",
  },
};

// The email a student gets when a club admin shortlists, accepts or rejects them.
// Returns null for statuses that don't warrant an email.
export function statusEmail({ name, club, opening, status, url }) {
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  const lead = copy.lead(escapeHtml(club), escapeHtml(opening));
  const text = `Hi ${name},\n\n${lead.replace(/<[^>]+>/g, "")}\n\n${copy.next}\n\nTrack your applications: ${url}`;
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px">
    <h2 style="margin:0 0 8px;color:#0b2a5b">JoinClub <span style="color:#c2410c">PEC</span></h2>
    <p style="color:#374151">Hi ${escapeHtml(name)},</p>
    <p style="color:#374151">${lead}</p>
    <p style="color:#374151">${escapeHtml(copy.next)}</p>
    <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#0b2a5b;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">View my applications</a></p>
  </div>`;
  return { subject: copy.subject(club), html, text };
}
