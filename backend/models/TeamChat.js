import mongoose from "mongoose";

// TeamChat model for Tier B - Team Chat feature
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ["text", "file", "link", "system"],
      default: "text",
    },
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const teamChatSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      unique: true,
    },
    messages: [messageSchema],
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    // Track who is currently typing
    typingUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        startedAt: Date,
      },
    ],
    // Track online status
    onlineUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        lastSeen: Date,
      },
    ],
  },
  { timestamps: true }
);

// Add message to chat
teamChatSchema.methods.addMessage = async function (senderId, content, messageType = "text", fileData = null) {
  const message = {
    sender: senderId,
    content,
    messageType,
    readBy: [{ user: senderId, readAt: new Date() }],
  };

  if (fileData) {
    message.fileUrl = fileData.url;
    message.fileName = fileData.name;
    message.fileSize = fileData.size;
  }

  this.messages.push(message);
  this.lastActivity = new Date();
  await this.save();

  return this.messages[this.messages.length - 1];
};

// Mark messages as read
teamChatSchema.methods.markAsRead = async function (userId, messageIds = []) {
  const now = new Date();
  
  this.messages.forEach((message) => {
    if (messageIds.length === 0 || messageIds.includes(message._id.toString())) {
      const alreadyRead = message.readBy.some(
        (r) => r.user.toString() === userId.toString()
      );
      if (!alreadyRead) {
        message.readBy.push({ user: userId, readAt: now });
      }
    }
  });

  await this.save();
};

// Get unread count for a user
teamChatSchema.methods.getUnreadCount = function (userId) {
  return this.messages.filter(
    (msg) => !msg.readBy.some((r) => r.user.toString() === userId.toString())
  ).length;
};

const TeamChat = mongoose.model("TeamChat", teamChatSchema);
export default TeamChat;
