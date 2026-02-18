import api from "../api/axios";

// Organizer services
export const organizerService = {
  // Public: List all organizers
  getAll: async () => {
    const response = await api.get("/organizers");
    return response.data;
  },

  // Public: Get organizer details
  getById: async (id) => {
    const response = await api.get(`/organizers/${id}`);
    return response.data;
  },

  // Follow/unfollow organizer
  toggleFollow: async (id) => {
    const response = await api.post(`/organizers/${id}/follow`);
    return response.data;
  },

  // Organizer: Get own profile
  getProfile: async () => {
    const response = await api.get("/organizers/me/profile");
    return response.data;
  },

  // Organizer: Update profile
  updateProfile: async (data) => {
    const response = await api.put("/organizers/me/profile", data);
    return response.data;
  },

  // Organizer: Get own events
  getMyEvents: async () => {
    const response = await api.get("/organizers/me/events");
    return response.data;
  },

  // Organizer: Get ongoing events (for navbar/listing)
  getOngoingEvents: async () => {
    const response = await api.get("/organizers/me/events/ongoing");
    return response.data;
  },

  // Organizer: Get specific event details
  getEventDetails: async (id) => {
    const response = await api.get(`/organizers/me/events/${id}`);
    return response.data;
  },

  // Organizer: Create event
  createEvent: async (eventData) => {
    const response = await api.post("/organizers/me/events", eventData);
    return response.data;
  },

  // Organizer: Update event
  updateEvent: async (id, eventData) => {
    const response = await api.put(`/organizers/me/events/${id}`, eventData);
    return response.data;
  },

  // Organizer: Publish event
  publishEvent: async (id) => {
    const response = await api.put(`/organizers/me/events/${id}/publish`);
    return response.data;
  },

  // Organizer: Get event participants
  getParticipants: async (eventId, params = {}) => {
    const response = await api.get(`/organizers/me/events/${eventId}/participants`, { params });
    return response.data;
  },

  // Organizer: Export participants CSV
  exportParticipantsCSV: async (eventId) => {
    const response = await api.get(`/organizers/me/events/${eventId}/export-csv`, {
      responseType: "text",
    });
    return response.data;
  },

  // Organizer: Get event analytics
  getEventAnalytics: async (eventId) => {
    const response = await api.get(`/organizers/me/events/${eventId}/analytics`);
    return response.data;
  },

  // Organizer: Get overall analytics
  getAnalytics: async () => {
    const response = await api.get("/organizers/me/analytics");
    return response.data;
  },

  // Organizer: Request password reset
  requestPasswordReset: async (reason) => {
    const response = await api.post("/organizers/me/request-password-reset", { reason });
    return response.data;
  },
};

export default organizerService;
