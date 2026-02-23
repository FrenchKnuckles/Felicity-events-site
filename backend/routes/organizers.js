import express from "express";
import {
  getOrganizerProfile,
  updateOrganizerProfile,
  getOrganizerEvents,
  getOngoingEvents,
  getOrganizerEventById,
  createEvent,
  updateEvent,
  publishEvent,
  getEventParticipants,
  getOrganizerAnalytics,
  requestPasswordReset,
  listOrganizers,
  getOrganizerById,
  toggleFollowOrganizer,
  exportParticipantsCSV,
  getEventAnalytics,
  deleteEvent,
  getMerchandiseOrders,
  approveMerchandiseOrder,
  rejectMerchandiseOrder,
} from "../controllers/organizerController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Organizer protected routes (must come BEFORE /:id to avoid conflicts)
router.get("/me/profile", protect, authorize("organizer"), getOrganizerProfile);
router.put("/me/profile", protect, authorize("organizer"), updateOrganizerProfile);
router.get("/me/events/ongoing", protect, authorize("organizer"), getOngoingEvents);
router.get("/me/events", protect, authorize("organizer"), getOrganizerEvents);
router.post("/me/events", protect, authorize("organizer"), createEvent);
router.get("/me/events/:id", protect, authorize("organizer"), getOrganizerEventById);
router.put("/me/events/:id", protect, authorize("organizer"), updateEvent);
router.delete("/me/events/:id", protect, authorize("organizer"), deleteEvent);
router.put("/me/events/:id/publish", protect, authorize("organizer"), publishEvent);
router.get("/me/events/:id/participants", protect, authorize("organizer"), getEventParticipants);
router.get("/me/events/:id/export-csv", protect, authorize("organizer"), exportParticipantsCSV);
router.get("/me/events/:id/analytics", protect, authorize("organizer"), getEventAnalytics);
router.get("/me/events/:id/merchandise-orders", protect, authorize("organizer"), getMerchandiseOrders);
router.put("/me/events/:id/merchandise-orders/:ticketId/approve", protect, authorize("organizer"), approveMerchandiseOrder);
router.put("/me/events/:id/merchandise-orders/:ticketId/reject", protect, authorize("organizer"), rejectMerchandiseOrder);
router.get("/me/analytics", protect, authorize("organizer"), getOrganizerAnalytics);
router.post("/me/request-password-reset", protect, authorize("organizer"), requestPasswordReset);

// Public routes
router.get("/", optionalAuth, listOrganizers);
router.get("/:id", getOrganizerById);

// Participant routes
router.post("/:id/follow", protect, authorize("participant"), toggleFollowOrganizer);

export default router;
