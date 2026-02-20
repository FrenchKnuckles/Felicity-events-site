import User from "../models/User.js";
import Organizer from "../models/Organizer.js";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import Attendance from "../models/Attendance.js";
import Team from "../models/Team.js";
import TeamChat from "../models/TeamChat.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import crypto from "crypto";
import { wrap } from "../middleware/error.js";

const genPwd = () => crypto.randomBytes(8).toString("hex");

export const createOrganizer = wrap(async (req, res) => {
  const { name, email, category, description, contactEmail, contactNumber, logo } = req.body;
  const loginEmail = email || contactEmail;
  if (!loginEmail) return res.status(400).json({ message: "Email is required" });
  if (await User.findOne({ email: loginEmail })) return res.status(400).json({ message: "User with this email already exists" });
  const password = genPwd();
  const user = await User.create({ firstName: name, lastName: "Organizer", email: loginEmail, password, role: "organizer" });
  const organizer = await Organizer.create({ name, category: category || "technical", description, contactEmail: loginEmail, contactNumber, logo, userId: user._id });
  user.organizerId = organizer._id; await user.save();
  res.status(201).json({ message: "Organizer created successfully", organizer, credentials: { email: loginEmail, password } });
});

export const getAllOrganizers = wrap(async (req, res) => {
  const organizers = await Organizer.find().populate("userId", "email").lean();
  const counts = await Event.aggregate([{ $group: { _id: "$organizerId", count: { $sum: 1 } } }]);
  const cm = new Map(counts.map(e => [e._id?.toString(), e.count]));
  res.json(organizers.map(o => ({ ...o, eventCount: cm.get(o._id.toString()) || 0 })));
});

export const getOrganizerById = wrap(async (req, res) => {
  const org = await Organizer.findById(req.params.id).populate("userId", "email").lean();
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  res.json({ ...org, eventCount: await Event.countDocuments({ organizerId: org._id }) });
});

export const updateOrganizer = wrap(async (req, res) => {
  const org = await Organizer.findById(req.params.id);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const { name, description, logo, category, contactEmail, contactNumber, discordWebhook } = req.body;
  if (contactEmail && contactEmail !== org.contactEmail && await User.findOne({ email: contactEmail, _id: { $ne: org.userId } })) return res.status(400).json({ message: "Email already in use" });
  if (name) org.name = name; if (description !== undefined) org.description = description;
  if (logo !== undefined) org.logo = logo; if (category) org.category = category;
  if (contactEmail) org.contactEmail = contactEmail; if (contactNumber !== undefined) org.contactNumber = contactNumber;
  if (discordWebhook !== undefined) org.discordWebhook = discordWebhook;
  await org.save();
  const user = await User.findById(org.userId);
  if (!user) return res.status(404).json({ message: "Linked user not found" });
  if (name) user.firstName = name; if (contactEmail) user.email = contactEmail; await user.save();
  res.json({ message: "Organizer updated successfully", organizer: await Organizer.findById(org._id).populate("userId", "email") });
});

export const removeOrganizer = wrap(async (req, res) => {
  const org = await Organizer.findById(req.params.id);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  if (req.query.action === "delete") {
    const eventIds = (await Event.find({ organizerId: org._id }).select("_id")).map(e => e._id);
    const teamIds = (await Team.find({ eventId: { $in: eventIds } }).select("_id")).map(t => t._id);
    await TeamChat.deleteMany({ team: { $in: teamIds } });
    await Team.deleteMany({ eventId: { $in: eventIds } });
    await Attendance.deleteMany({ eventId: { $in: eventIds } });
    await Ticket.deleteMany({ eventId: { $in: eventIds } });
    await Event.deleteMany({ organizerId: org._id });
    await PasswordResetRequest.deleteMany({ organizerId: org._id });
    await User.findByIdAndDelete(org.userId); await Organizer.findByIdAndDelete(org._id);
    res.json({ message: "Organizer permanently deleted" });
  } else { org.isActive = false; await org.save(); res.json({ message: "Organizer disabled successfully" }); }
});

export const enableOrganizer = wrap(async (req, res) => {
  const org = await Organizer.findById(req.params.id);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  org.isActive = true; await org.save();
  res.json({ message: "Organizer enabled successfully", organizer: org });
});

export const resetOrganizerPassword = wrap(async (req, res) => {
  const org = await Organizer.findById(req.params.id);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const user = await User.findById(org.userId);
  if (!user) return res.status(404).json({ message: "Linked user not found" });
  const pwd = genPwd(); user.password = pwd; await user.save();
  res.json({ message: "Organizer password reset successfully", temporaryPassword: pwd });
});

export const getPasswordResetRequests = wrap(async (req, res) => {
  const query = {}; if (req.query.status) query.status = req.query.status;
  res.json(await PasswordResetRequest.find(query).populate("organizerId", "name").populate("userId", "email").sort({ createdAt: -1 }));
});

export const processPasswordResetRequest = wrap(async (req, res) => {
  const { action, comment } = req.body;
  const request = await PasswordResetRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });
  request.status = action === "approve" ? "approved" : "rejected";
  request.adminComment = comment; request.processedAt = new Date(); request.processedBy = req.user._id;
  await request.save();
  let newPassword = null;
  if (action === "approve") { newPassword = genPwd(); const u = await User.findById(request.userId); u.password = newPassword; await u.save(); }
  res.json({ message: `Request ${action}d successfully`, newPassword: action === "approve" ? newPassword : undefined });
});

export const getAdminStats = wrap(async (req, res) => {
  const [totalOrganizers, activeOrganizers, totalUsers, totalEvents, pendingRequests] = await Promise.all([
    Organizer.countDocuments(), Organizer.countDocuments({ isActive: true }), User.countDocuments({ role: "participant" }),
    Event.countDocuments(), PasswordResetRequest.countDocuments({ status: "pending" }),
  ]);
  res.json({ totalOrganizers, activeOrganizers, totalUsers, totalEvents, pendingRequests });
});

export const getAllEventsAdmin = wrap(async (req, res) => {
  res.json(await Event.find().populate("organizerId", "name").sort({ createdAt: -1 }));
});

export const deleteEventAdmin = wrap(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  await Ticket.deleteMany({ eventId: event._id }); await Event.findByIdAndDelete(event._id);
  res.json({ message: "Event deleted successfully" });
});

export const getRecentEvents = wrap(async (req, res) => {
  res.json({ events: await Event.find().populate("organizerId", "name").sort({ createdAt: -1 }).limit(10) });
});
