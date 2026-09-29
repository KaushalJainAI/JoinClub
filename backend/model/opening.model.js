import mongoose from "mongoose";

// A recruitment drive, workshop or event registration that students apply to.
const openingSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    positions: { type: Number, default: 1, min: 1 },
    deadline: { type: Date, required: true },
    mode: { type: String, enum: ["recruitment", "workshop", "event"], default: "recruitment" },
    questions: [{ type: String }],
    status: { type: String, enum: ["open", "closed"], default: "open" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

openingSchema.index({ title: "text", description: "text" }, { name: "opening_text" });

openingSchema.index({ status: 1, deadline: 1 });
// Club page, open counts per club and the admin's own list all start from one club.
openingSchema.index({ club: 1, status: 1, deadline: 1 });

// Open means both marked open and not past its deadline. A plain function rather
// than a virtual, because most queries use .lean().
export const isOpen = (o) => o.status === "open" && new Date(o.deadline) > new Date();
export const withIsOpen = (o) => ({ ...o, isOpen: isOpen(o) });

export const Opening = mongoose.model("Opening", openingSchema);
