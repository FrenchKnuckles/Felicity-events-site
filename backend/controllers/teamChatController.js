import TeamChat from "../models/TeamChat.js";
import Team from "../models/Team.js";

// Get chat messages for a team
export const getChatMessages = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.id;

    // Verify user is a team member
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const isMember =
      team.leaderId.toString() === userId ||
      team.members.some((m) => m.userId?.toString() === userId && m.status === "accepted");

    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }

    let chat = await TeamChat.findOne({ team: teamId }).populate(
      "messages.sender",
      "firstName lastName email"
    );

    if (!chat) {
      // Create chat if it doesn't exist
      chat = await TeamChat.create({ team: teamId });
    }

    let messages = chat.messages;

    // Filter messages before a certain timestamp if provided
    if (before) {
      messages = messages.filter((m) => new Date(m.createdAt) < new Date(before));
    }

    // Get last N messages
    messages = messages.slice(-parseInt(limit));

    // Mark messages as read
    await chat.markAsRead(userId);

    res.json({
      messages,
      hasMore: chat.messages.length > parseInt(limit),
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({ message: "Failed to get messages", error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { content, messageType = "text", fileData } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Message content is required" });
    }

    // Verify user is a team member
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const isMember =
      team.leaderId.toString() === userId ||
      team.members.some((m) => m.userId?.toString() === userId && m.status === "accepted");

    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }

    let chat = await TeamChat.findOne({ team: teamId });
    if (!chat) {
      chat = await TeamChat.create({ team: teamId });
    }

    const message = await chat.addMessage(userId, content.trim(), messageType, fileData);

    // Populate sender info
    await chat.populate("messages.sender", "firstName lastName email");
    const populatedMessage = chat.messages[chat.messages.length - 1];

    res.status(201).json({
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

// Edit a message
export const editMessage = async (req, res) => {
  try {
    const { teamId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const chat = await TeamChat.findOne({ team: teamId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await chat.save();

    res.json({ message });
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ message: "Failed to edit message", error: error.message });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { teamId, messageId } = req.params;
    const userId = req.user.id;

    const chat = await TeamChat.findOne({ team: teamId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    chat.messages.pull(messageId);
    await chat.save();

    res.json({ message: "Message deleted" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Failed to delete message", error: error.message });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { messageIds } = req.body;
    const userId = req.user.id;

    const chat = await TeamChat.findOne({ team: teamId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    await chat.markAsRead(userId, messageIds);

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Failed to mark as read", error: error.message });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const chat = await TeamChat.findOne({ team: teamId });
    if (!chat) {
      return res.json({ unreadCount: 0 });
    }

    const unreadCount = chat.getUnreadCount(userId);
    res.json({ unreadCount });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ message: "Failed to get unread count", error: error.message });
  }
};

// Update typing status
export const updateTypingStatus = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { isTyping } = req.body;
    const userId = req.user.id;

    const chat = await TeamChat.findOne({ team: teamId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (isTyping) {
      const existingIndex = chat.typingUsers.findIndex(
        (t) => t.user.toString() === userId
      );
      if (existingIndex === -1) {
        chat.typingUsers.push({ user: userId, startedAt: new Date() });
      } else {
        chat.typingUsers[existingIndex].startedAt = new Date();
      }
    } else {
      chat.typingUsers = chat.typingUsers.filter(
        (t) => t.user.toString() !== userId
      );
    }

    await chat.save();
    res.json({ message: "Typing status updated" });
  } catch (error) {
    console.error("Update typing status error:", error);
    res.status(500).json({ message: "Failed to update typing status", error: error.message });
  }
};

// Update online status
export const updateOnlineStatus = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const chat = await TeamChat.findOne({ team: teamId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const existingIndex = chat.onlineUsers.findIndex(
      (o) => o.user.toString() === userId
    );

    if (existingIndex === -1) {
      chat.onlineUsers.push({ user: userId, lastSeen: new Date() });
    } else {
      chat.onlineUsers[existingIndex].lastSeen = new Date();
    }

    await chat.save();
    res.json({ message: "Online status updated" });
  } catch (error) {
    console.error("Update online status error:", error);
    res.status(500).json({ message: "Failed to update online status", error: error.message });
  }
};

// Get online users
export const getOnlineUsers = async (req, res) => {
  try {
    const { teamId } = req.params;

    const chat = await TeamChat.findOne({ team: teamId }).populate(
      "onlineUsers.user",
      "firstName lastName"
    );

    if (!chat) {
      return res.json({ onlineUsers: [] });
    }

    // Filter users who were active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = chat.onlineUsers
      .filter((o) => o.lastSeen > fiveMinutesAgo)
      .map((o) => ({
        _id: o.user._id,
        name: `${o.user.firstName} ${o.user.lastName}`,
        lastSeen: o.lastSeen,
      }));

    res.json({ onlineUsers });
  } catch (error) {
    console.error("Get online users error:", error);
    res.status(500).json({ message: "Failed to get online users", error: error.message });
  }
};

// Get typing users
export const getTypingUsers = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const chat = await TeamChat.findOne({ team: teamId }).populate(
      "typingUsers.user",
      "firstName lastName"
    );

    if (!chat) {
      return res.json({ typingUsers: [] });
    }

    // Filter users who started typing in the last 10 seconds (excluding current user)
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    const typingUsers = chat.typingUsers
      .filter((t) => t.startedAt > tenSecondsAgo && t.user._id.toString() !== userId)
      .map((t) => ({
        _id: t.user._id,
        name: `${t.user.firstName} ${t.user.lastName}`,
      }));

    res.json({ typingUsers });
  } catch (error) {
    console.error("Get typing users error:", error);
    res.status(500).json({ message: "Failed to get typing users", error: error.message });
  }
};
