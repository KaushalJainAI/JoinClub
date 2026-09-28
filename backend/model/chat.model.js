import mongoose from "mongoose";

export const CHAT_MODES = ["helpdesk", "interview"];

// Chats are kept for 180 days, then MongoDB deletes them on its own. Without this the
// transcripts of every student who ever tried the assistant would sit in the database
// forever, which the privacy notice does not promise.
export const CHAT_RETENTION_DAYS = 180;
const CHAT_TTL_SECONDS = CHAT_RETENTION_DAYS * 24 * 60 * 60;

const chatSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mode: { type: String, enum: CHAT_MODES, required: true },
    title: { type: String, default: "New chat" },
    // Interview progress lives here so the server, not the model, keeps count.
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const chatMessageSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "" },
    options: [{ type: String }],
    suggestions: [{ type: String }],
  },
  { timestamps: true }
);

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

// One TTL per collection: a session expires on its last activity, a message on when it was
// sent, so neither outlives the retention window by more than a conversation's length.
chatSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: CHAT_TTL_SECONDS, name: "chat_session_ttl" });
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: CHAT_TTL_SECONDS, name: "chat_message_ttl" });
