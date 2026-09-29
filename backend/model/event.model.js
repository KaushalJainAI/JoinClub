import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true, index: true },
    venue: { type: String, default: "PEC Campus" },
    type: { type: String, enum: ["workshop", "competition", "performance", "talk", "social", "fest"], default: "social" },
  },
  { timestamps: true }
);

// One club's upcoming events, soonest first (club page, dashboard, admin events).
eventSchema.index({ club: 1, date: 1 });

export const Event =mongoose.model("Event", eventSchema);
