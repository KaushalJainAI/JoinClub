import mongoose from "mongoose";

// Mail that could not be sent. Gmail's SMTP quota is about 500 messages a day, so a
// recruitment week can quietly exhaust it; without a record, the only symptom is students
// saying the code never arrived. Kept for 30 days, which is enough to spot a quota run-out.
const mailFailureSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, default: "" },
    message: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

mailFailureSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, name: "mail_failure_ttl" });

export const MailFailure = mongoose.model("MailFailure", mailFailureSchema);
