import api from "../api/axios";

// Admin services
export const adminService = {
  // Get dashboard stats
  getStats: async () => {
    const response = await api.get("/admin/stats");
    return response.data;
  },

  // Get recent events
  getRecentEvents: async () => {
    const response = await api.get("/admin/events/recent");
    return response.data;
  },

  // Get all organizers
  getOrganizers: async () => {
    const response = await api.get("/admin/organizers");
    // Backend returns array directly
    return response.data;
  },

  // Get organizer by ID
  getOrganizerById: async (id) => {
    const response = await api.get(`/admin/organizers/${id}`);
    return response.data;
  },

  // Create organizer
  createOrganizer: async (data) => {
    const response = await api.post("/admin/organizers", data);
    return response.data;
  },

  // Update organizer
  updateOrganizer: async (id, data) => {
    const response = await api.put(`/admin/organizers/${id}`, data);
    return response.data;
  },

  // Disable organizer (archive — cannot log in but data preserved)
  disableOrganizer: async (id) => {
    const response = await api.delete(`/admin/organizers/${id}`);
    return response.data;
  },

  // Enable organizer (re-activate a disabled organizer)
  enableOrganizer: async (id) => {
    const response = await api.put(`/admin/organizers/${id}/enable`);
    return response.data;
  },

  // Permanently delete organizer and their user account
  deleteOrganizer: async (id) => {
    const response = await api.delete(`/admin/organizers/${id}?action=delete`);
    return response.data;
  },

  // Reset organizer password
  resetOrganizerPassword: async (id) => {
    const response = await api.post(`/admin/organizers/${id}/reset-password`);
    return response.data;
  },

  // Get password reset requests
  getPasswordRequests: async (params = {}) => {
    const response = await api.get("/admin/password-requests", { params });
    return response.data;
  },

  // Handle password reset request (action: 'approve' or 'reject')
  handlePasswordRequest: async (id, action) => {
    const response = await api.put(`/admin/password-requests/${id}`, { action });
    return response.data;
  },

  // Delete an event
  deleteEvent: async (id) => {
    const response = await api.delete(`/admin/events/${id}`);
    return response.data;
  },
};

export default adminService;
