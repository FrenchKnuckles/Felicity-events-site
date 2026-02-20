import Organizer from "../models/Organizer.js";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import { postToDiscord } from "../utils/discord.js";
import { wrap } from "../middleware/error.js";

const getOrg = req => Organizer.findOne({ userId: req.user._id });

export const getOrganizerProfile = wrap(async (req, res) => {
  const org = await getOrg(req);
  if (!org) return res.status(404).json({ message: "Organizer profile not found" });
  res.json(org);
});

export const updateOrganizerProfile = wrap(async (req, res) => {
  const { name, category, description, contactEmail, contactNumber, discordWebhook } = req.body;
  const org = await getOrg(req);
  if (!org) return res.status(404).json({ message: "Organizer profile not found" });
  if (name) org.name = name;
  if (category) org.category = category;
  if (description) org.description = description;
  if (contactEmail) org.contactEmail = contactEmail;
  if (contactNumber) org.contactNumber = contactNumber;
  if (discordWebhook !== undefined) org.discordWebhook = discordWebhook;
  await org.save();
  res.json({ message: "Profile updated successfully", organizer: org });
});

export const getOrganizerEvents = wrap(async (req, res) => {
  const org = await getOrg(req);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const query = { organizerId: org._id };
  if (req.query.status) query.status = req.query.status;
  res.json(await Event.find(query).sort({ createdAt: -1 }));
});

export const getOngoingEvents = wrap(async (req, res) => {
  const org = await getOrg(req);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  res.json(await Event.find({ organizerId: org._id, status: "ongoing" })
    .select("name eventType startDate endDate registrationCount").sort({ startDate: 1 }));
});

export const getOrganizerEventById = wrap(async (req, res) => {
  const org = await getOrg(req);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (event.organizerId.toString() !== org._id.toString()) return res.status(403).json({ message: "Not authorized to view this event" });
  await event.populate({ path: "organizerId", select: "name" });
  res.json(event);
});

export const createEvent = wrap(async (req, res) => {
  const org = await getOrg(req);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const event = await Event.create({ ...req.body, organizerId: org._id, status: "draft" });
  res.status(201).json({ message: "Event created as draft", event });
});

export const updateEvent = wrap(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  const org = await getOrg(req);
  if (event.organizerId.toString() !== org._id.toString()) return res.status(403).json({ message: "Not authorized to edit this event" });
  if (event.status === "draft") {
    if (event.formLocked && req.body.customForm) return res.status(400).json({ message: "Custom form cannot be edited after first registration" });
    Object.assign(event, req.body);
  } else if (event.status === "published") {
    const { description, registrationDeadline, registrationLimit, status } = req.body;
    if (description) event.description = description;
    if (registrationDeadline && new Date(registrationDeadline) > event.registrationDeadline) event.registrationDeadline = registrationDeadline;
    if (registrationLimit && registrationLimit > event.registrationLimit) event.registrationLimit = registrationLimit;
    if (status === "closed" || status === "ongoing") event.status = status;
  } else if (event.status === "ongoing" || event.status === "completed") {
    const { status } = req.body;
    if (status === "completed" || status === "closed") event.status = status;
    else return res.status(400).json({ message: "Only status change allowed for ongoing/completed events" });
  }
  await event.save();
  res.json({ message: "Event updated successfully", event });
});

export const publishEvent = wrap(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (event.status !== "draft") return res.status(400).json({ message: "Only draft events can be published" });
  event.status = "published";
  await event.save();
  const org = await Organizer.findById(event.organizerId);
  if (org.discordWebhook) await postToDiscord(org.discordWebhook, event);
  res.json({ message: "Event published successfully", event });
});

export const getEventParticipants = wrap(async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const query = { eventId: req.params.id };
  if (status) query.status = status;
  const tickets = await Ticket.find(query)
    .populate("userId", "firstName lastName email contactNumber collegeOrg participantType")
    .populate("teamId", "name").sort({ createdAt: -1 })
    .skip((page - 1) * limit).limit(parseInt(limit));
  const total = await Ticket.countDocuments(query);
  let results = tickets;
  if (search) {
    const s = search.toLowerCase();
    results = tickets.filter(t => t.userId.firstName.toLowerCase().includes(s) || t.userId.lastName.toLowerCase().includes(s) || t.userId.email.toLowerCase().includes(s));
  }
  res.json({ participants: results, page: parseInt(page), pages: Math.ceil(total / limit), total });
});

export const getOrganizerAnalytics = wrap(async (req, res) => {
  const org = await getOrg(req);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const events = await Event.find({ organizerId: org._id });
  const completed = events.filter(e => e.status === "completed");
  let totalAttendance = 0;
  for (const ev of completed) totalAttendance += await Ticket.countDocuments({ eventId: ev._id, attended: true });
  const cnt = s => events.filter(e => e.status === s).length;
  const sum = (arr, f) => arr.reduce((s, e) => s + e[f], 0);
  res.json({
    totalEvents: events.length, draftEvents: cnt("draft"), publishedEvents: cnt("published"),
    ongoingEvents: cnt("ongoing"), completedEvents: completed.length, closedEvents: cnt("closed"),
    totalRegistrations: sum(events, "registrationCount"), totalRevenue: sum(events, "revenue"),
    completedEventsStats: {
      totalRegistrations: sum(completed, "registrationCount"), totalRevenue: sum(completed, "revenue"),
      totalAttendance, averageAttendanceRate: completed.length > 0 ? ((totalAttendance / sum(completed, "registrationCount")) * 100).toFixed(1) : 0,
    },
  });
});

export const requestPasswordReset = wrap(async (req, res) => {
  const org = await getOrg(req);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const existing = await PasswordResetRequest.findOne({ organizerId: org._id, status: "pending" });
  if (existing) return res.status(400).json({ message: "You already have a pending password reset request" });
  const request = await PasswordResetRequest.create({ organizerId: org._id, userId: req.user._id, reason: req.body.reason });
  res.status(201).json({ message: "Password reset request submitted", request });
});

export const listOrganizers = wrap(async (req, res) => {
  const orgs = await Organizer.find({ isActive: true }).select("name category description contactEmail followers");
  const orgIds = orgs.map(o => o._id);
  const eventCounts = await Event.aggregate([
    { $match: { organizerId: { $in: orgIds }, status: { $in: ["published", "ongoing", "completed"] } } },
    { $group: { _id: "$organizerId", count: { $sum: 1 } } },
  ]);
  const ecMap = {}; eventCounts.forEach(e => ecMap[e._id.toString()] = e.count);
  const userId = req.user?._id?.toString();
  res.json(orgs.map(o => ({
    _id: o._id, name: o.name, category: o.category, description: o.description,
    followerCount: o.followers?.length || 0, eventCount: ecMap[o._id.toString()] || 0,
    isFollowing: userId ? o.followers?.some(f => f.toString() === userId) : false,
  })));
});

export const getOrganizerById = wrap(async (req, res) => {
  const org = await Organizer.findOne({ _id: req.params.id, isActive: true }).select("name category description contactEmail");
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const now = new Date();
  const upcomingEvents = await Event.find({ organizerId: org._id, status: { $in: ["published", "ongoing"] }, startDate: { $gte: now } }).select("name eventType startDate");
  const pastEvents = await Event.find({ organizerId: org._id, status: "completed" }).select("name eventType startDate");
  res.json({ organizer: org, upcomingEvents, pastEvents });
});

export const toggleFollowOrganizer = wrap(async (req, res) => {
  const org = await Organizer.findById(req.params.id);
  if (!org) return res.status(404).json({ message: "Organizer not found" });
  const user = await User.findById(req.user._id);
  const isFollowing = user.followedOrganizers.includes(org._id);
  if (isFollowing) {
    user.followedOrganizers = user.followedOrganizers.filter(id => id.toString() !== org._id.toString());
    org.followers = org.followers.filter(id => id.toString() !== user._id.toString());
  } else { user.followedOrganizers.push(org._id); org.followers.push(user._id); }
  await user.save(); await org.save();
  await user.populate("followedOrganizers", "name category");
  res.json({ message: isFollowing ? "Unfollowed successfully" : "Followed successfully", isFollowing: !isFollowing, followedOrganizers: user.followedOrganizers });
});

export const exportParticipantsCSV = wrap(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  const org = await getOrg(req);
  if (event.organizerId.toString() !== org._id.toString()) return res.status(403).json({ message: "Not authorized" });
  const tickets = await Ticket.find({ eventId: req.params.id, status: { $ne: "cancelled" } })
    .populate("userId", "firstName lastName email contactNumber collegeOrg participantType").populate("teamId", "name");
  const fields = ["Ticket ID", "First Name", "Last Name", "Email", "Contact Number", "College/Org", "Participant Type", "Team Name", "Status", "Attendance", "Registered At"];
  if (event.customForm?.length) event.customForm.forEach(f => fields.push(f.label));
  let csv = fields.join(",") + "\n";
  tickets.forEach(t => {
    const row = [t.ticketId, t.userId?.firstName || "", t.userId?.lastName || "", t.userId?.email || "", t.userId?.contactNumber || "",
      `"${t.userId?.collegeOrg || ""}"`, t.userId?.participantType || "", t.teamId?.name || "", t.status, t.attended ? "checked-in" : "not-checked", new Date(t.createdAt).toISOString()];
    if (event.customForm?.length) event.customForm.forEach(f => {
      const v = t.formResponses?.get(f.fieldName) || t.formResponses?.[f.fieldName] || "";
      row.push(`"${String(v).replace(/"/g, '""')}"`);
    });
    csv += row.join(",") + "\n";
  });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${event.name}-participants.csv"`);
  res.send(csv);
});

export const getEventAnalytics = wrap(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  const org = await getOrg(req);
  if (event.organizerId.toString() !== org._id.toString()) return res.status(403).json({ message: "Not authorized" });
  const [totalTickets, confirmedTickets, cancelledTickets, attendedTickets] = await Promise.all([
    Ticket.countDocuments({ eventId: event._id }), Ticket.countDocuments({ eventId: event._id, status: "confirmed" }),
    Ticket.countDocuments({ eventId: event._id, status: "cancelled" }), Ticket.countDocuments({ eventId: event._id, attended: true }),
  ]);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const registrationTrend = await Ticket.aggregate([
    { $match: { eventId: event._id, createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const participantBreakdown = await Ticket.aggregate([
    { $match: { eventId: event._id, status: { $ne: "cancelled" } } },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $group: { _id: "$user.participantType", count: { $sum: 1 } } },
  ]);
  let teamStats = null;
  const Team = (await import("../models/Team.js")).default;
  const teams = await Team.find({ eventId: event._id });
  if (teams.length > 0) {
    const complete = teams.filter(t => t.status === "complete").length;
    const incomplete = teams.filter(t => t.status === "incomplete").length;
    teamStats = { totalTeams: teams.length, completeTeams: complete, incompleteTeams: incomplete, completionRate: ((complete / teams.length) * 100).toFixed(1) };
  }
  res.json({
    event: { name: event.name, status: event.status, registrationLimit: event.registrationLimit, registrationDeadline: event.registrationDeadline },
    stats: { totalRegistrations: totalTickets, confirmed: confirmedTickets, cancelled: cancelledTickets, attended: attendedTickets,
      attendanceRate: confirmedTickets > 0 ? ((attendedTickets / confirmedTickets) * 100).toFixed(1) : 0, revenue: event.revenue },
    teamStats, registrationTrend, participantBreakdown,
  });
});

export const deleteEvent = wrap(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  const org = await getOrg(req);
  if (event.organizerId.toString() !== org._id.toString()) return res.status(403).json({ message: "Not authorized" });
  if (event.status !== "draft") return res.status(400).json({ message: "Only draft events can be deleted" });
  await Event.findByIdAndDelete(req.params.id);
  res.json({ message: "Event deleted successfully" });
});
