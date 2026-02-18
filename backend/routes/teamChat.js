import express from "express";
import {
  getChatMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
  getUnreadCount,
  updateTypingStatus,
  updateOnlineStatus,
  getOnlineUsers,
  getTypingUsers,
} from "../controllers/teamChatController.js";
import { authenticateParticipant } from "../middleware/auth.js";

const router = express.Router();

// All routes require participant authentication
router.use(authenticateParticipant);

// Chat messages
router.get("/:teamId/messages", getChatMessages);
router.post("/:teamId/messages", sendMessage);
router.put("/:teamId/messages/:messageId", editMessage);
router.delete("/:teamId/messages/:messageId", deleteMessage);

// Read status
router.post("/:teamId/mark-read", markAsRead);
router.get("/:teamId/unread-count", getUnreadCount);

// Real-time status
router.post("/:teamId/typing", updateTypingStatus);
router.post("/:teamId/online", updateOnlineStatus);
router.get("/:teamId/online-users", getOnlineUsers);
router.get("/:teamId/typing-users", getTypingUsers);

export default router;
