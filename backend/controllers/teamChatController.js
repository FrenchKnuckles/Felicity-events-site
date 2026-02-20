import TeamChat from "../models/TeamChat.js";
import Team from "../models/Team.js";
import { wrap } from "../middleware/error.js";

const verifyMember = async (teamId, userId) => {
  const team = await Team.findById(teamId);
  if (!team) return null;
  const ok = team.leaderId.toString() === userId || team.members.some(m => m.userId?.toString() === userId && m.status === "accepted");
  return ok ? team : null;
};
const getChat = async teamId => (await TeamChat.findOne({ team: teamId })) || (await TeamChat.create({ team: teamId }));

export const getChatMessages = wrap(async (req, res) => {
  const { teamId } = req.params;
  const { limit = 50, before } = req.query;
  if (!(await verifyMember(teamId, req.user.id))) return res.status(403).json({ message: "You are not a member of this team" });
  let chat = await TeamChat.findOne({ team: teamId }).populate("messages.sender", "firstName lastName email");
  if (!chat) chat = await TeamChat.create({ team: teamId });
  let msgs = chat.messages;
  if (before) msgs = msgs.filter(m => new Date(m.createdAt) < new Date(before));
  msgs = msgs.slice(-parseInt(limit));
  await chat.markAsRead(req.user.id);
  res.json({ messages: msgs, hasMore: chat.messages.length > parseInt(limit) });
});

export const sendMessage = wrap(async (req, res) => {
  const { teamId } = req.params;
  const { content, messageType = "text", fileData } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: "Message content is required" });
  if (!(await verifyMember(teamId, req.user.id))) return res.status(403).json({ message: "You are not a member of this team" });
  const chat = await getChat(teamId);
  await chat.addMessage(req.user.id, content.trim(), messageType, fileData);
  await chat.populate("messages.sender", "firstName lastName email");
  res.status(201).json({ message: chat.messages[chat.messages.length - 1] });
});

export const editMessage = wrap(async (req, res) => {
  const { teamId, messageId } = req.params;
  const chat = await TeamChat.findOne({ team: teamId });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  const msg = chat.messages.id(messageId);
  if (!msg) return res.status(404).json({ message: "Message not found" });
  if (msg.sender.toString() !== req.user.id) return res.status(403).json({ message: "You can only edit your own messages" });
  msg.content = req.body.content; msg.isEdited = true; msg.editedAt = new Date();
  await chat.save();
  res.json({ message: msg });
});

export const deleteMessage = wrap(async (req, res) => {
  const { teamId, messageId } = req.params;
  const chat = await TeamChat.findOne({ team: teamId });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  const msg = chat.messages.id(messageId);
  if (!msg) return res.status(404).json({ message: "Message not found" });
  if (msg.sender.toString() !== req.user.id) return res.status(403).json({ message: "You can only delete your own messages" });
  chat.messages.pull(messageId); await chat.save();
  res.json({ message: "Message deleted" });
});

export const markAsRead = wrap(async (req, res) => {
  const chat = await TeamChat.findOne({ team: req.params.teamId });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  await chat.markAsRead(req.user.id, req.body.messageIds);
  res.json({ message: "Messages marked as read" });
});

export const getUnreadCount = wrap(async (req, res) => {
  const chat = await TeamChat.findOne({ team: req.params.teamId });
  res.json({ unreadCount: chat ? chat.getUnreadCount(req.user.id) : 0 });
});

export const updateTypingStatus = wrap(async (req, res) => {
  const chat = await TeamChat.findOne({ team: req.params.teamId });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  if (req.body.isTyping) {
    const idx = chat.typingUsers.findIndex(t => t.user.toString() === req.user.id);
    if (idx === -1) chat.typingUsers.push({ user: req.user.id, startedAt: new Date() });
    else chat.typingUsers[idx].startedAt = new Date();
  } else chat.typingUsers = chat.typingUsers.filter(t => t.user.toString() !== req.user.id);
  await chat.save();
  res.json({ message: "Typing status updated" });
});

export const updateOnlineStatus = wrap(async (req, res) => {
  const chat = await TeamChat.findOne({ team: req.params.teamId });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  const idx = chat.onlineUsers.findIndex(o => o.user.toString() === req.user.id);
  if (idx === -1) chat.onlineUsers.push({ user: req.user.id, lastSeen: new Date() });
  else chat.onlineUsers[idx].lastSeen = new Date();
  await chat.save();
  res.json({ message: "Online status updated" });
});

export const getOnlineUsers = wrap(async (req, res) => {
  const chat = await TeamChat.findOne({ team: req.params.teamId }).populate("onlineUsers.user", "firstName lastName");
  if (!chat) return res.json({ onlineUsers: [] });
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  res.json({ onlineUsers: chat.onlineUsers.filter(o => o.lastSeen > cutoff).map(o => ({ _id: o.user._id, name: `${o.user.firstName} ${o.user.lastName}`, lastSeen: o.lastSeen })) });
});

export const getTypingUsers = wrap(async (req, res) => {
  const chat = await TeamChat.findOne({ team: req.params.teamId }).populate("typingUsers.user", "firstName lastName");
  if (!chat) return res.json({ typingUsers: [] });
  const cutoff = new Date(Date.now() - 10 * 1000);
  res.json({ typingUsers: chat.typingUsers.filter(t => t.startedAt > cutoff && t.user._id.toString() !== req.user.id).map(t => ({ _id: t.user._id, name: `${t.user.firstName} ${t.user.lastName}` })) });
});
