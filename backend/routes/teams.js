import express from "express";
import {
  createTeam,
  joinTeam,
  inviteMember,
  respondToInvite,
  completeTeamRegistration,
  getTeam,
  getMyTeams,
  leaveTeam,
  getTeamByInviteCode,
} from "../controllers/teamController.js";
import { authenticateParticipant } from "../middleware/auth.js";

const router = express.Router();

// All routes require participant authentication
router.use(authenticateParticipant);

// Team management
router.post("/", createTeam);
router.get("/my-teams", getMyTeams);
router.get("/invite/:inviteCode", getTeamByInviteCode);
router.post("/join/:inviteCode", joinTeam);
router.get("/:teamId", getTeam);
router.post("/:teamId/invite", inviteMember);
router.post("/:teamId/respond-invite", respondToInvite);
router.post("/:teamId/complete-registration", completeTeamRegistration);
router.delete("/:teamId/leave", leaveTeam);

export default router;
