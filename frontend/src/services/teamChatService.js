import api from "../api/axios";

const teamChatService = {
  // Get chat messages
  getMessages: (teamId, params = {}) =>
    api.get(`/team-chat/${teamId}/messages`, { params }),

  // Send message
  sendMessage: (teamId, content, messageType = "text", fileUrl = null) =>
    api.post(`/team-chat/${teamId}/messages`, { content, messageType, fileUrl }),

  // Edit message
  editMessage: (teamId, messageId, content) =>
    api.put(`/team-chat/${teamId}/messages/${messageId}`, { content }),

  // Delete message
  deleteMessage: (teamId, messageId) =>
    api.delete(`/team-chat/${teamId}/messages/${messageId}`),

  // Mark messages as read
  markAsRead: (teamId) => api.post(`/team-chat/${teamId}/mark-read`),

  // Update typing status
  updateTypingStatus: (teamId, isTyping) =>
    api.post(`/team-chat/${teamId}/typing`, { isTyping }),

  // Update online status
  updateOnlineStatus: (teamId, isOnline) =>
    api.post(`/team-chat/${teamId}/online`, { isOnline }),

  // Get online users
  getOnlineUsers: (teamId) => api.get(`/team-chat/${teamId}/online-users`),

  // Get typing users
  getTypingUsers: (teamId) => api.get(`/team-chat/${teamId}/typing-users`),
};

export default teamChatService;
