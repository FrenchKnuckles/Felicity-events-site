import express from "express";
import {
  createOrganizer,
  getAllOrganizers,
  getOrganizerById,
  updateOrganizer,
  removeOrganizer,
  enableOrganizer,
  resetOrganizerPassword,
  getPasswordResetRequests,
  processPasswordResetRequest,
  getAdminStats,
  getRecentEvents,
  getAllEventsAdmin,
  deleteEventAdmin,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect, authorize("admin"));

// Dashboard
router.get("/stats", getAdminStats);
router.get("/events/recent", getRecentEvents);
router.get("/events", getAllEventsAdmin);
router.delete("/events/:id", deleteEventAdmin);

// Organizer management
router.post("/organizers", createOrganizer);
router.get("/organizers", getAllOrganizers);
router.get("/organizers/:id", getOrganizerById);
router.put("/organizers/:id", updateOrganizer);
router.delete("/organizers/:id", removeOrganizer);
router.put("/organizers/:id/enable", enableOrganizer);
router.post("/organizers/:id/reset-password", resetOrganizerPassword);

// Password reset requests (Tier B)
router.get("/password-requests", getPasswordResetRequests);
router.put("/password-requests/:id", processPasswordResetRequest);

export default router;
