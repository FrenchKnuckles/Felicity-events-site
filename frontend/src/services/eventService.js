import api from "../api/axios";

// Event services
export const eventService = {
  // Get all events with filters
  getEvents: async (params = {}) => {
    const response = await api.get("/events", { params });
    return response.data;
  },

  // Get trending events
  getTrending: async () => {
    const response = await api.get("/events/trending");
    return response.data;
  },

  // Get single event (returns raw data)
  getById: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Backward-compatible helpers
  getEventById: async (id) => {
    const data = await eventService.getById(id);
    return data?.event || data;
  },

  // Register for event
  register: async (eventId, formResponses = {}) => {
    const response = await api.post(`/events/${eventId}/register`, { formResponses });
    return response.data;
  },

  // Purchase merchandise
  purchase: async (eventId, variantId, quantity = 1, paymentProof) => {
    const response = await api.post(`/events/${eventId}/purchase`, { variantId, quantity, paymentProof });
    return response.data;
  },

  // Get user's events
  getMyEvents: async () => {
    const response = await api.get("/events/user/my-events");
    return response.data;
  },

  // Get ticket by ID
  getTicket: async (ticketId) => {
    const response = await api.get(`/events/tickets/${ticketId}`);
    return response.data;
  },

  // Forum support
  getForumMessages: async (eventId) => {
    const response = await api.get(`/events/${eventId}/forum`);
    return response.data;
  },
  postForumMessage: async (eventId, body) => {
    const response = await api.post(`/events/${eventId}/forum`, body);
    return response.data;
  },
  deleteForumMessage: async (eventId, msgId) => {
    const response = await api.delete(`/events/${eventId}/forum/${msgId}`);
    return response.data;
  },
  pinForumMessage: async (eventId, msgId) => {
    const response = await api.put(`/events/${eventId}/forum/${msgId}/pin`);
    return response.data;
  },
  reactForumMessage: async (eventId, msgId, emoji) => {
    const response = await api.put(`/events/${eventId}/forum/${msgId}/react`, { emoji });
    return response.data;
  },
};

export default eventService;
