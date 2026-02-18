import express from "express";
import {
  scanQRCheckIn,
  manualCheckIn,
  getAttendanceDashboard,
  exportAttendanceCSV,
  getAuditLogs,
  searchParticipant,
} from "../controllers/attendanceController.js";
import { authenticateOrganizer } from "../middleware/auth.js";

const router = express.Router();

// All routes require organizer authentication
router.use(authenticateOrganizer);

// QR scanning and check-in
router.post("/:eventId/scan", scanQRCheckIn);
router.post("/:eventId/manual-checkin", manualCheckIn);

// Dashboard and reporting
router.get("/:eventId/dashboard", getAttendanceDashboard);
router.get("/:eventId/export-csv", exportAttendanceCSV);
router.get("/:eventId/audit-logs", getAuditLogs);

// Search for manual check-in
router.get("/:eventId/search", searchParticipant);

export default router;
