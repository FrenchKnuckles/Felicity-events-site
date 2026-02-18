import api from "../api/axios";

const attendanceService = {
  // Scan QR code and check-in
  scanQRCheckIn: (eventId, qrData) =>
    api.post(`/attendance/${eventId}/scan`, { qrData }),

  // Manual check-in with override
  manualCheckIn: (eventId, ticketId, reason) =>
    api.post(`/attendance/${eventId}/manual-checkin`, { ticketId, reason }),

  // Get attendance dashboard data
  getAttendanceDashboard: (eventId) =>
    api.get(`/attendance/${eventId}/dashboard`),

  // Export attendance as CSV
  exportAttendanceCSV: (eventId, includeNotCheckedIn = false) =>
    api.get(`/attendance/${eventId}/export-csv`, {
      params: { includeNotCheckedIn },
      responseType: "blob",
    }),

  // Get audit logs
  getAuditLogs: (eventId, params = {}) =>
    api.get(`/attendance/${eventId}/audit-logs`, { params }),

  // Search participant for manual check-in
  searchParticipant: (eventId, query) =>
    api.get(`/attendance/${eventId}/search`, { params: { query } }),
};

export default attendanceService;
