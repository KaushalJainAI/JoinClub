import mongoose from "mongoose";

export const APPLICATION_STATUSES = ["pending", "shortlisted", "accepted", "rejected", "withdrawn"];

const applicationSchema = new mongoose.Schema(
  {
    opening: { type: mongoose.Schema.Types.ObjectId, ref: "Opening", required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index: true },
    // Set to a fresh id (not null) when the applicant deletes their account, so the unique
    // index below still behaves and no user document is left to look up.
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // True once the applicant erased their account: the record stays for the club, without
    // the name, email or answers.
    applicantDeleted: { type: Boolean, default: false },
    answers: [{ question: String, answer: String, _id: false }],
    status: { type: String, enum: APPLICATION_STATUSES, default: "pending" },
    // Who moved it where and when, appended by updateStatus and withdraw. The student sees
    // the timeline without the `by` field; the club admin sees names.
    history: [{ status: String, by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: Date, _id: false }],
    // Private note from the club admin; never shown to the student.
    adminNote: { type: String, default: "", select: false },
  },
  { timestamps: true }
);

// One application per student per opening; also closes the double-submit race.
applicationSchema.index({ opening: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ club: 1, status: 1, createdAt: -1 });
// A student's own list (My Applications, the assistant's context), newest first.
applicationSchema.index({ applicant: 1, createdAt: -1 });

export const Application = mongoose.model("Application", applicationSchema);
