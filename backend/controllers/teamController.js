import Team from "../models/Team.js";
import TeamChat from "../models/TeamChat.js";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import QRCode from "qrcode";

// Create a new team (Team Leader)
export const createTeam = async (req, res) => {
  try {
    const { eventId, teamName, maxSize, minSize } = req.body;
    const leaderId = req.user.id;

    // Check if event exists and allows team registration
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.allowTeamRegistration) {
      return res.status(400).json({ message: "This event does not support team registration" });
    }

    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: "Registration deadline has passed" });
    }

    // Check if user is already in a team for this event
    const existingTeam = await Team.findOne({
      eventId,
      $or: [
        { leaderId },
        { "members.userId": leaderId, "members.status": { $in: ["pending", "accepted"] } },
      ],
    });

    if (existingTeam) {
      return res.status(400).json({ message: "You are already in a team for this event" });
    }

    // Generate unique invite code
    let inviteCode;
    let isUnique = false;
    while (!isUnique) {
      inviteCode = Team.generateInviteCode();
      const existing = await Team.findOne({ inviteCode });
      if (!existing) isUnique = true;
    }

    const team = new Team({
      name: teamName,
      eventId,
      leaderId,
      maxSize: maxSize || event.maxTeamSize || 4,
      minSize: minSize || event.minTeamSize || 2,
      inviteCode,
      status: "forming",
    });

    await team.save();

    // Create team chat room
    await TeamChat.create({ team: team._id });

    res.status(201).json({
      message: "Team created successfully",
      team: {
        _id: team._id,
        name: team.name,
        inviteCode: team.inviteCode,
        maxSize: team.maxSize,
        minSize: team.minSize,
        status: team.status,
        inviteLink: `${process.env.FRONTEND_URL}/teams/join/${team.inviteCode}`,
      },
    });
  } catch (error) {
    console.error("Create team error:", error);
    res.status(500).json({ message: "Failed to create team", error: error.message });
  }
};

// Join team via invite code
export const joinTeam = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user.id;

    const team = await Team.findOne({ inviteCode }).populate("eventId");
    if (!team) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    if (team.status !== "forming") {
      return res.status(400).json({ message: "This team is no longer accepting members" });
    }

    // Check if team is full
    const acceptedCount = team.members.filter((m) => m.status === "accepted").length;
    if (acceptedCount + 1 >= team.maxSize) {
      return res.status(400).json({ message: "Team is full" });
    }

    // Check if user is already a member or leader
    if (team.leaderId.toString() === userId) {
      return res.status(400).json({ message: "You are the leader of this team" });
    }

    const existingMember = team.members.find((m) => m.userId?.toString() === userId);
    if (existingMember) {
      if (existingMember.status === "accepted") {
        return res.status(400).json({ message: "You are already a member of this team" });
      }
      if (existingMember.status === "pending") {
        return res.status(400).json({ message: "You already have a pending invite to this team" });
      }
    }

    // Check if user is in another team for this event
    const otherTeam = await Team.findOne({
      eventId: team.eventId._id,
      _id: { $ne: team._id },
      $or: [
        { leaderId: userId },
        { "members.userId": userId, "members.status": { $in: ["pending", "accepted"] } },
      ],
    });

    if (otherTeam) {
      return res.status(400).json({ message: "You are already in another team for this event" });
    }

    // Add user to team
    team.members.push({
      userId,
      status: "accepted",
      joinedAt: new Date(),
    });

    // Check if team is now complete
    const newAcceptedCount = team.members.filter((m) => m.status === "accepted").length;
    if (newAcceptedCount + 1 >= team.minSize) {
      // Team meets minimum size, can be marked complete
      if (newAcceptedCount + 1 >= team.maxSize) {
        team.status = "complete";
      }
    }

    await team.save();

    res.json({
      message: "Successfully joined the team",
      team: {
        _id: team._id,
        name: team.name,
        status: team.status,
        currentSize: newAcceptedCount + 1,
        maxSize: team.maxSize,
      },
    });
  } catch (error) {
    console.error("Join team error:", error);
    res.status(500).json({ message: "Failed to join team", error: error.message });
  }
};

// Invite member to team (Team Leader)
export const inviteMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email } = req.body;
    const leaderId = req.user.id;

    const team = await Team.findById(teamId).populate("eventId");
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.leaderId.toString() !== leaderId) {
      return res.status(403).json({ message: "Only team leader can invite members" });
    }

    if (team.status !== "forming") {
      return res.status(400).json({ message: "Team is no longer accepting members" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found with this email" });
    }

    // Check if already a member
    const existingMember = team.members.find((m) => m.userId?.toString() === user._id.toString());
    if (existingMember) {
      return res.status(400).json({ message: "User already invited or member of this team" });
    }

    // Add pending invite
    team.members.push({
      userId: user._id,
      status: "pending",
    });

    await team.save();

    // Send email invitation
    try {
      await sendEmail({
        to: email,
        subject: `Team Invitation: ${team.name} for ${team.eventId.name}`,
        html: `
          <h2>You've been invited to join a team!</h2>
          <p>You have been invited to join team <strong>${team.name}</strong> for the event <strong>${team.eventId.name}</strong>.</p>
          <p>Use this invite code to join: <strong>${team.inviteCode}</strong></p>
          <p>Or click this link: <a href="${process.env.FRONTEND_URL}/teams/join/${team.inviteCode}">Join Team</a></p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
    }

    res.json({ message: "Invitation sent successfully" });
  } catch (error) {
    console.error("Invite member error:", error);
    res.status(500).json({ message: "Failed to invite member", error: error.message });
  }
};

// Accept/Decline team invite
export const respondToInvite = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const memberIndex = team.members.findIndex(
      (m) => m.userId?.toString() === userId && m.status === "pending"
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "No pending invite found" });
    }

    if (action === "accept") {
      team.members[memberIndex].status = "accepted";
      team.members[memberIndex].joinedAt = new Date();

      // Check if team is complete
      const acceptedCount = team.members.filter((m) => m.status === "accepted").length;
      if (acceptedCount + 1 >= team.maxSize) {
        team.status = "complete";
      }
    } else {
      team.members[memberIndex].status = "rejected";
    }

    await team.save();

    res.json({
      message: action === "accept" ? "Joined team successfully" : "Invitation declined",
      team: {
        _id: team._id,
        name: team.name,
        status: team.status,
      },
    });
  } catch (error) {
    console.error("Respond to invite error:", error);
    res.status(500).json({ message: "Failed to respond to invite", error: error.message });
  }
};

// Complete team registration (finalize)
export const completeTeamRegistration = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { formResponses } = req.body;
    const leaderId = req.user.id;

    const team = await Team.findById(teamId).populate("eventId");
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.leaderId.toString() !== leaderId) {
      return res.status(403).json({ message: "Only team leader can complete registration" });
    }

    // Check minimum team size
    const acceptedMembers = team.members.filter((m) => m.status === "accepted");
    if (acceptedMembers.length + 1 < team.minSize) {
      return res.status(400).json({
        message: `Team needs at least ${team.minSize} members. Current: ${acceptedMembers.length + 1}`,
      });
    }

    // Generate tickets for all team members
    const tickets = [];
    const allMembers = [team.leaderId, ...acceptedMembers.map((m) => m.userId)];

    for (const memberId of allMembers) {
      const qrData = JSON.stringify({
        teamId: team._id,
        eventId: team.eventId._id,
        userId: memberId,
        timestamp: Date.now(),
      });

      const qrCode = await QRCode.toDataURL(qrData);

      const ticket = new Ticket({
        ticketId: `TKT-${team._id.toString().slice(-4)}-${memberId.toString().slice(-4)}-${Date.now().toString(36)}`.toUpperCase(),
        eventId: team.eventId._id,
        userId: memberId,
        teamId: team._id,
        qrCode,
        status: "confirmed",
        formResponses: formResponses || {},
      });

      await ticket.save();
      tickets.push(ticket);

      // Update member's ticket reference
      if (memberId.toString() !== leaderId) {
        const memberIndex = team.members.findIndex(
          (m) => m.userId?.toString() === memberId.toString()
        );
        if (memberIndex !== -1) {
          team.members[memberIndex].ticketId = ticket._id;
        }
      }
    }

    team.status = "complete";
    team.isRegistrationComplete = true;
    team.formResponses = formResponses;
    await team.save();

    // Update event registration count
    await Event.findByIdAndUpdate(team.eventId._id, {
      $inc: { registrationCount: tickets.length },
    });

    res.json({
      message: "Team registration completed successfully",
      team: {
        _id: team._id,
        name: team.name,
        status: team.status,
      },
      tickets: tickets.map((t) => ({
        _id: t._id,
        userId: t.userId,
        qrCode: t.qrCode,
      })),
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    res.status(500).json({ message: "Failed to complete registration", error: error.message });
  }
};

// Get team details
export const getTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const team = await Team.findById(teamId)
      .populate("leaderId", "firstName lastName email")
      .populate("members.userId", "firstName lastName email")
      .populate("eventId", "name startDate");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if user is a member
    const isMember =
      team.leaderId._id.toString() === userId ||
      team.members.some((m) => m.userId?._id.toString() === userId && m.status === "accepted");

    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this team" });
    }

    res.json({ team });
  } catch (error) {
    console.error("Get team error:", error);
    res.status(500).json({ message: "Failed to get team", error: error.message });
  }
};

// Get user's teams
export const getMyTeams = async (req, res) => {
  try {
    const userId = req.user.id;

    const teams = await Team.find({
      $or: [
        { leaderId: userId },
        { "members.userId": userId, "members.status": "accepted" },
      ],
    })
      .populate("eventId", "name startDate status")
      .populate("leaderId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({ teams });
  } catch (error) {
    console.error("Get my teams error:", error);
    res.status(500).json({ message: "Failed to get teams", error: error.message });
  }
};

// Leave team
export const leaveTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.leaderId.toString() === userId) {
      return res.status(400).json({ message: "Team leader cannot leave. Transfer leadership or disband the team." });
    }

    if (team.isRegistrationComplete) {
      return res.status(400).json({ message: "Cannot leave team after registration is complete" });
    }

    const memberIndex = team.members.findIndex(
      (m) => m.userId?.toString() === userId && m.status === "accepted"
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "You are not a member of this team" });
    }

    team.members.splice(memberIndex, 1);
    
    // Update team status if needed
    const acceptedCount = team.members.filter((m) => m.status === "accepted").length;
    if (team.status === "complete" && acceptedCount + 1 < team.minSize) {
      team.status = "forming";
    }

    await team.save();

    res.json({ message: "Left team successfully" });
  } catch (error) {
    console.error("Leave team error:", error);
    res.status(500).json({ message: "Failed to leave team", error: error.message });
  }
};

// Get team by invite code (public info)
export const getTeamByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const team = await Team.findOne({ inviteCode })
      .populate("eventId", "name startDate registrationDeadline")
      .populate("leaderId", "firstName lastName");

    if (!team) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    const acceptedCount = team.members.filter((m) => m.status === "accepted").length;

    res.json({
      team: {
        _id: team._id,
        name: team.name,
        event: team.eventId,
        leader: team.leaderId ? `${team.leaderId.firstName} ${team.leaderId.lastName}` : "Unknown",
        currentSize: acceptedCount + 1,
        maxSize: team.maxSize,
        status: team.status,
      },
    });
  } catch (error) {
    console.error("Get team by code error:", error);
    res.status(500).json({ message: "Failed to get team", error: error.message });
  }
};
