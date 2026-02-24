import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  emoji: { type: String, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  pinned: { type: Boolean, default: false },
  // announcements are treated as pinned and styled differently
  isAnnouncement: { type: Boolean, default: false },
  reactions: [reactionSchema],
  attachmentUrl: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);