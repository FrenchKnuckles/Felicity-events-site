import Message from "../models/Message.js";
import Ticket from "../models/Ticket.js";
import { getIO } from "../utils/socket.js";
import { wrap } from "../middleware/error.js";
import mongoose from "mongoose";

// helper to verify that a participant has a ticket for the event
const verifyParticipant = async (userId, eventId) => {
  if (!userId) return false;
  const ticket = await Ticket.findOne({ eventId, userId });
  return !!ticket;
};

export const getForumMessages = wrap(async (req, res) => {
  const { id: eventId } = req.params;
  // allow organizers or registered participants
  if (req.user.role === "participant") {
    const ok = await verifyParticipant(req.user._id, eventId);
    if (!ok) return res.status(403).json({ message: "Must be registered to view forum" });
  }
  const messages = await Message.find({ eventId }).sort({ createdAt: 1 }).populate("userId", "firstName lastName");
  res.json({ messages });
});

export const postForumMessage = wrap(async (req, res) => {
  const { id: eventId } = req.params;
  const { content, parentId, attachmentUrl, isAnnouncement } = req.body;
  if (req.user.role === "participant") {
    const ok = await verifyParticipant(req.user._id, eventId);
    if (!ok) return res.status(403).json({ message: "Must be registered to post" });
  }
  const msg = new Message({
    eventId,
    userId: req.user._id,
    content: content || "",
    parentId: parentId && mongoose.Types.ObjectId(parentId) || null,
    attachmentUrl: attachmentUrl || "",
    isAnnouncement: req.user.role === "organizer" ? !!isAnnouncement : false,
  });
  await msg.save();
  const populated = await msg.populate("userId", "firstName lastName");
  const io = getIO();
  io.to(`event_${eventId}`).emit("newMessage", populated);
  res.status(201).json({ message: populated });
});

export const deleteForumMessage = wrap(async (req, res) => {
  const { id: eventId, msgId } = req.params;
  const msg = await Message.findById(msgId);
  if (!msg || msg.eventId.toString() !== eventId) return res.status(404).json({ message: "Message not found" });
  if (req.user.role !== "organizer" && msg.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not permitted" });
  }
  await msg.remove();
  const io = getIO();
  io.to(`event_${eventId}`).emit("messageDeleted", { _id: msgId });
  res.json({ message: "deleted" });
});

export const pinForumMessage = wrap(async (req, res) => {
  const { id: eventId, msgId } = req.params;
  if (req.user.role !== "organizer") return res.status(403).json({ message: "Organizer only" });
  const msg = await Message.findById(msgId);
  if (!msg || msg.eventId.toString() !== eventId) return res.status(404).json({ message: "Message not found" });
  msg.pinned = !msg.pinned;
  await msg.save();
  const io = getIO();
  io.to(`event_${eventId}`).emit("messagePinned", { _id: msgId, pinned: msg.pinned });
  res.json({ message: msg });
});

export const reactForumMessage = wrap(async (req, res) => {
  const { id: eventId, msgId } = req.params;
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ message: "Emoji required" });
  const msg = await Message.findById(msgId);
  if (!msg || msg.eventId.toString() !== eventId) return res.status(404).json({ message: "Message not found" });
  const existing = msg.reactions.find(r => r.user.toString() === req.user._id.toString() && r.emoji === emoji);
  if (existing) {
    // remove reaction
    msg.reactions = msg.reactions.filter(r => !(r.user.toString() === req.user._id.toString() && r.emoji === emoji));
  } else {
    msg.reactions.push({ user: req.user._id, emoji });
  }
  await msg.save();
  const populated = await msg.populate("userId", "firstName lastName");
  const io = getIO();
  io.to(`event_${eventId}`).emit("messageReacted", populated);
  res.json({ message: populated });
});
