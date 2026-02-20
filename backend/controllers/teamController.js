import Team from "../models/Team.js";
import TeamChat from "../models/TeamChat.js";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import QRCode from "qrcode";
import { wrap } from "../middleware/error.js";

export const createTeam = wrap(async (req, res) => {
  const { eventId, teamName, maxSize, minSize } = req.body;
  const leaderId = req.user.id;
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (!event.allowTeamRegistration) return res.status(400).json({ message: "This event does not support team registration" });
  if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) return res.status(400).json({ message: "Registration deadline has passed" });
  const existing = await Team.findOne({ eventId, $or: [{ leaderId }, { "members.userId": leaderId, "members.status": { $in: ["pending", "accepted"] } }] });
  if (existing) return res.status(400).json({ message: "You are already in a team for this event" });
  let inviteCode, isUnique = false;
  while (!isUnique) { inviteCode = Team.generateInviteCode(); if (!(await Team.findOne({ inviteCode }))) isUnique = true; }
  const team = new Team({ name: teamName, eventId, leaderId, maxSize: maxSize || event.maxTeamSize || 4, minSize: minSize || event.minTeamSize || 2, inviteCode, status: "forming" });
  await team.save();
  await TeamChat.create({ team: team._id });
  res.status(201).json({ message: "Team created successfully", team: { _id: team._id, name: team.name, inviteCode: team.inviteCode, maxSize: team.maxSize, minSize: team.minSize, status: team.status, inviteLink: `${process.env.FRONTEND_URL}/teams/join/${team.inviteCode}` } });
});

export const joinTeam = wrap(async (req, res) => {
  const userId = req.user.id;
  const team = await Team.findOne({ inviteCode: req.params.inviteCode }).populate("eventId");
  if (!team) return res.status(404).json({ message: "Invalid invite code" });
  if (team.status !== "forming") return res.status(400).json({ message: "This team is no longer accepting members" });
  const accepted = team.members.filter(m => m.status === "accepted").length;
  if (accepted + 1 >= team.maxSize) return res.status(400).json({ message: "Team is full" });
  if (team.leaderId.toString() === userId) return res.status(400).json({ message: "You are the leader of this team" });
  const em = team.members.find(m => m.userId?.toString() === userId);
  if (em?.status === "accepted") return res.status(400).json({ message: "You are already a member of this team" });
  if (em?.status === "pending") return res.status(400).json({ message: "You already have a pending invite to this team" });
  const other = await Team.findOne({ eventId: team.eventId._id, _id: { $ne: team._id }, $or: [{ leaderId: userId }, { "members.userId": userId, "members.status": { $in: ["pending", "accepted"] } }] });
  if (other) return res.status(400).json({ message: "You are already in another team for this event" });
  team.members.push({ userId, status: "accepted", joinedAt: new Date() });
  const newCount = team.members.filter(m => m.status === "accepted").length;
  if (newCount + 1 >= team.maxSize) team.status = "complete";
  await team.save();
  res.json({ message: "Successfully joined the team", team: { _id: team._id, name: team.name, status: team.status, currentSize: newCount + 1, maxSize: team.maxSize } });
});

export const inviteMember = wrap(async (req, res) => {
  const team = await Team.findById(req.params.teamId).populate("eventId");
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (team.leaderId.toString() !== req.user.id) return res.status(403).json({ message: "Only team leader can invite members" });
  if (team.status !== "forming") return res.status(400).json({ message: "Team is no longer accepting members" });
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found with this email" });
  if (team.members.find(m => m.userId?.toString() === user._id.toString())) return res.status(400).json({ message: "User already invited or member of this team" });
  team.members.push({ userId: user._id, status: "pending" });
  await team.save();
  try {
    await sendEmail({ to: req.body.email, subject: `Team Invitation: ${team.name} for ${team.eventId.name}`,
      html: `<h2>You've been invited to join a team!</h2><p>Team <strong>${team.name}</strong> for <strong>${team.eventId.name}</strong>.</p><p>Invite code: <strong>${team.inviteCode}</strong></p><p><a href="${process.env.FRONTEND_URL}/teams/join/${team.inviteCode}">Join Team</a></p>` });
  } catch (e) { console.error("Failed to send invitation email:", e); }
  res.json({ message: "Invitation sent successfully" });
});

export const respondToInvite = wrap(async (req, res) => {
  const team = await Team.findById(req.params.teamId);
  if (!team) return res.status(404).json({ message: "Team not found" });
  const idx = team.members.findIndex(m => m.userId?.toString() === req.user.id && m.status === "pending");
  if (idx === -1) return res.status(404).json({ message: "No pending invite found" });
  if (req.body.action === "accept") {
    team.members[idx].status = "accepted"; team.members[idx].joinedAt = new Date();
    if (team.members.filter(m => m.status === "accepted").length + 1 >= team.maxSize) team.status = "complete";
  } else team.members[idx].status = "rejected";
  await team.save();
  res.json({ message: req.body.action === "accept" ? "Joined team successfully" : "Invitation declined", team: { _id: team._id, name: team.name, status: team.status } });
});

export const completeTeamRegistration = wrap(async (req, res) => {
  const { formResponses } = req.body;
  const team = await Team.findById(req.params.teamId).populate("eventId");
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (team.leaderId.toString() !== req.user.id) return res.status(403).json({ message: "Only team leader can complete registration" });
  const accepted = team.members.filter(m => m.status === "accepted");
  if (accepted.length + 1 < team.minSize) return res.status(400).json({ message: `Team needs at least ${team.minSize} members. Current: ${accepted.length + 1}` });
  const tickets = [];
  const allMembers = [team.leaderId, ...accepted.map(m => m.userId)];
  for (const memberId of allMembers) {
    const qrData = JSON.stringify({ teamId: team._id, eventId: team.eventId._id, userId: memberId, timestamp: Date.now() });
    const qrCode = await QRCode.toDataURL(qrData);
    const ticket = new Ticket({ ticketId: `TKT-${team._id.toString().slice(-4)}-${memberId.toString().slice(-4)}-${Date.now().toString(36)}`.toUpperCase(),
      eventId: team.eventId._id, userId: memberId, teamId: team._id, qrCode, status: "confirmed", formResponses: formResponses || {} });
    await ticket.save(); tickets.push(ticket);
    if (memberId.toString() !== req.user.id) {
      const mi = team.members.findIndex(m => m.userId?.toString() === memberId.toString());
      if (mi !== -1) team.members[mi].ticketId = ticket._id;
    }
  }
  team.status = "complete"; team.isRegistrationComplete = true; team.formResponses = formResponses; await team.save();
  await Event.findByIdAndUpdate(team.eventId._id, { $inc: { registrationCount: tickets.length } });
  res.json({ message: "Team registration completed successfully", team: { _id: team._id, name: team.name, status: team.status }, tickets: tickets.map(t => ({ _id: t._id, userId: t.userId, qrCode: t.qrCode })) });
});

export const getTeam = wrap(async (req, res) => {
  const team = await Team.findById(req.params.teamId).populate("leaderId", "firstName lastName email").populate("members.userId", "firstName lastName email").populate("eventId", "name startDate");
  if (!team) return res.status(404).json({ message: "Team not found" });
  const isMember = team.leaderId._id.toString() === req.user.id || team.members.some(m => m.userId?._id.toString() === req.user.id && m.status === "accepted");
  if (!isMember) return res.status(403).json({ message: "You are not a member of this team" });
  res.json({ team });
});

export const getMyTeams = wrap(async (req, res) => {
  const teams = await Team.find({ $or: [{ leaderId: req.user.id }, { "members.userId": req.user.id, "members.status": "accepted" }] })
    .populate("eventId", "name startDate status").populate("leaderId", "firstName lastName email").sort({ createdAt: -1 });
  res.json({ teams });
});

export const leaveTeam = wrap(async (req, res) => {
  const team = await Team.findById(req.params.teamId);
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (team.leaderId.toString() === req.user.id) return res.status(400).json({ message: "Team leader cannot leave. Transfer leadership or disband the team." });
  if (team.isRegistrationComplete) return res.status(400).json({ message: "Cannot leave team after registration is complete" });
  const idx = team.members.findIndex(m => m.userId?.toString() === req.user.id && m.status === "accepted");
  if (idx === -1) return res.status(404).json({ message: "You are not a member of this team" });
  team.members.splice(idx, 1);
  if (team.status === "complete" && team.members.filter(m => m.status === "accepted").length + 1 < team.minSize) team.status = "forming";
  await team.save();
  res.json({ message: "Left team successfully" });
});

export const getTeamByInviteCode = wrap(async (req, res) => {
  const team = await Team.findOne({ inviteCode: req.params.inviteCode }).populate("eventId", "name startDate registrationDeadline").populate("leaderId", "firstName lastName");
  if (!team) return res.status(404).json({ message: "Invalid invite code" });
  const accepted = team.members.filter(m => m.status === "accepted").length;
  res.json({ team: { _id: team._id, name: team.name, event: team.eventId, leader: team.leaderId ? `${team.leaderId.firstName} ${team.leaderId.lastName}` : "Unknown", currentSize: accepted + 1, maxSize: team.maxSize, status: team.status } });
});
