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
