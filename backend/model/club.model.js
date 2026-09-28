import mongoose from "mongoose";

export const CLUB_CATEGORIES = ["technical", "cultural", "literary", "social", "sports"];

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, enum: CLUB_CATEGORIES, required: true },

    // The pitch: what the club page leads with.
    tagline: { type: String, default: "" },
    pitch: { type: String, default: "" },
    summary: { type: String, default: "" },
    about: [{ type: String }],
    whyJoin: [{ title: String, text: String, _id: false }],
    activities: [{ type: String }],
    signatureEvents: [{ name: String, text: String, _id: false }],
    skills: [{ type: String }],
    lookingFor: { type: String, default: "" },
    commitment: { type: String, default: "" },
    testimonials: [{ name: String, branch: String, year: Number, quote: String, _id: false }],

    logo: { type: String, default: "" },
    cover: { type: String, default: "" },
    gallery: [{ type: String }],
    color: { type: String, default: "#2563eb" },
    icon: { type: String, default: "Sparkles" },
    foundedYear: { type: Number },

    leadership: [{ role: String, name: String, _id: false }],
    socials: {
      instagram: String,
      facebook: String,
      youtube: String,
      linkedin: String,
      website: String,
      email: String,
    },
    memberCount: { type: Number, default: 0 },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Set when a club is wound down for the year. It stays readable by slug for old links
    // and in the super-admin list, but drops out of the public listings.
    archivedAt: { type: Date, default: null },
    sourceUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

clubSchema.index(
  { name: "text", shortName: "text", tagline: "text", summary: "text", skills: "text", activities: "text" },
  { weights: { name: 10, shortName: 10, tagline: 4, skills: 3 }, name: "club_text" }
);

export const Club = mongoose.model("Club", clubSchema);
