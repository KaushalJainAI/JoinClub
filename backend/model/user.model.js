import mongoose from "mongoose";

export const ROLES = ["student", "club_admin", "super_admin"];
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

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phoneNumber: { type: String, default: "" },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "student" },
    // Set for club_admin: the one club this account manages. This is the source of truth;
    // Club.admins[] is derived from it (see utils/admins.js).
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club" },
    // Deactivated accounts keep their data and history but cannot sign in.
    active: { type: Boolean, default: true },
    // Seeded admin accounts must pick their own password on first login.
    mustChangePassword: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    // Consent to sending this student's text to Anthropic for the AI features, and when.
    consentAi: { type: Boolean, default: false },
    consentAiAt: { type: Date },
    // Per-feature choices on top of consent. Opting out of the applicant summary keeps
    // their answers out of the club admin's AI view.
    aiApplicantSummary: { type: Boolean, default: true },
    // Bumped on password change/reset; tokens carrying an older version stop working.
    tokenVersion: { type: Number, default: 0 },
    profile: {
      bio: { type: String, default: "" },
      skills: [{ type: String }],
      interests: [{ type: String }],
      sid: { type: String, default: "" },
      branch: { type: String, default: "" },
      year: { type: Number, min: 1, max: 5 },
      resume: { type: String, default: "" },
      resumeOriginalName: { type: String, default: "" },
      profilePhoto: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Never send the password hash to the client, whichever controller serialises the user.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
