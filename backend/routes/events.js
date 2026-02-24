import express from "express";
import {
  getEvents,
  getTrendingEvents,
  getEventById,
  registerForEvent,
  purchaseMerchandise,
  getMyEvents,
  getTicketById,
  cancelRegistration,
  getInterestsOptions,
} from "../controllers/eventController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";
import {
  getForumMessages,
  postForumMessage,
  deleteForumMessage,
  pinForumMessage,
  reactForumMessage,
} from "../controllers/forumController.js";

const router = express.Router();

// Public routes
router.get("/interests", getInterestsOptions);
router.get("/trending", getTrendingEvents);

// Protected routes (Participant) - MUST be before /:id
router.get("/user/my-events", protect, authorize("participant"), getMyEvents);
router.get("/tickets/:ticketId", protect, getTicketById);
router.put("/tickets/:ticketId/cancel", protect, cancelRegistration);

// Public routes with params (optionalAuth for preference-based sorting)
router.get("/", optionalAuth, getEvents);
router.get("/:id", optionalAuth, getEventById);

// Protected routes (Participant)
router.post("/:id/register", protect, authorize("participant"), registerForEvent);
router.post("/:id/purchase", protect, authorize("participant"), purchaseMerchandise);


router.get("/:id/forum", protect, getForumMessages);
router.post("/:id/forum", protect, postForumMessage);
router.delete("/:id/forum/:msgId", protect, deleteForumMessage);
router.put("/:id/forum/:msgId/pin", protect, pinForumMessage);
router.put("/:id/forum/:msgId/react", protect, reactForumMessage);

export default router;
