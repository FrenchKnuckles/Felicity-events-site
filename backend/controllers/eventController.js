import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import Organizer from "../models/Organizer.js";
import User from "../models/User.js";
import { generateTicketId, generateQRCode } from "../utils/ticket.js";
import { sendTicketEmail } from "../utils/email.js";
import { AREAS_OF_INTEREST } from "../utils/constants.js";
import { wrap } from "../middleware/error.js";

export const getEvents = wrap(async (req, res) => {
  const { search, eventType, eligibility, startDate, endDate, organizer, followed, page = 1, limit = 12, sortBy = "startDate" } = req.query;
  let query = { status: { $in: ["published", "ongoing"] } };
  if (search) {
    const orgIds = (await Organizer.find({ name: { $regex: search, $options: "i" } }).select("_id")).map(o => o._id);
    query.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }, { tags: { $regex: search, $options: "i" } }, { organizerId: { $in: orgIds } }];
  }
  if (eventType) query.eventType = eventType;
  if (eligibility) query.eligibility = eligibility;
  if (organizer) query.organizerId = organizer;
  if (startDate || endDate) { query.startDate = {}; if (startDate) query.startDate.$gte = new Date(startDate); if (endDate) query.startDate.$lte = new Date(endDate); }
  if (followed === "true" && req.user) {
    const u = await User.findById(req.user._id);
    if (u?.followedOrganizers?.length) query.organizerId = { $in: u.followedOrganizers };
  }
  const total = await Event.countDocuments(query);
  let events = await Event.find(query).populate("organizerId", "name category")
    .sort({ [sortBy]: sortBy === "registrationDeadline" ? 1 : -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  if (req.user) {
    const u = await User.findById(req.user._id);
    if (u?.areasOfInterest?.length) events = events.sort((a, b) => (b.tags?.some(t => u.areasOfInterest.includes(t)) ? 1 : 0) - (a.tags?.some(t => u.areasOfInterest.includes(t)) ? 1 : 0));
  }
  res.json({ events, page: parseInt(page), pages: Math.ceil(total / limit), total });
});

export const getTrendingEvents = wrap(async (req, res) => {
  const ago = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await Ticket.aggregate([
    { $match: { createdAt: { $gte: ago }, status: { $in: ["confirmed", "pending"] } } },
    { $group: { _id: "$eventId", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 },
  ]);
  const ids = recent.map(r => r._id);
  let events;
  if (ids.length > 0) {
    events = await Event.find({ _id: { $in: ids }, status: { $in: ["published", "ongoing"] } }).populate("organizerId", "name category");
    const cm = {}; recent.forEach(r => cm[r._id.toString()] = r.count);
    events.sort((a, b) => (cm[b._id.toString()] || 0) - (cm[a._id.toString()] || 0));
  } else {
    events = await Event.find({ status: { $in: ["published", "ongoing"] } }).sort({ createdAt: -1 }).limit(5).populate("organizerId", "name category");
  }
  res.json(events);
});

export const getEventById = wrap(async (req, res) => {
  const event = await Event.findById(req.params.id).populate("organizerId", "name category description contactEmail");
  if (!event) return res.status(404).json({ message: "Event not found" });
  let userRegistration = null;
  if (req.user) userRegistration = await Ticket.findOne({ eventId: event._id, userId: req.user._id, status: { $ne: "cancelled" } });
  res.json({ ...event.toObject(), userRegistered: !!userRegistration, userTicket: userRegistration });
});

export const registerForEvent = wrap(async (req, res) => {
  const { formResponses } = req.body;
  const event = await Event.findById(req.params.id).populate("organizerId");
  if (!event) return res.status(404).json({ message: "Event not found" });
  if (event.status !== "published" && event.status !== "ongoing") return res.status(400).json({ message: "Event is not open for registration" });
  if (new Date() > new Date(event.registrationDeadline)) return res.status(400).json({ message: "Registration deadline has passed" });
  if (event.registrationLimit && event.registrationCount >= event.registrationLimit) return res.status(400).json({ message: "Registration limit reached" });
  if (event.eligibility === "iiit-only" && req.user.participantType !== "iiit") return res.status(403).json({ message: "This event is only for IIIT participants" });
  if (event.eligibility === "non-iiit-only" && req.user.participantType === "iiit") return res.status(403).json({ message: "This event is only for Non-IIIT participants" });
  const existing = await Ticket.findOne({ eventId: event._id, userId: req.user._id, status: { $ne: "cancelled" } });
  if (existing) return res.status(400).json({ message: "Already registered for this event" });
  if (event.customForm?.length) {
    for (const f of event.customForm) if (f.required && (!formResponses || !formResponses[f.fieldName])) return res.status(400).json({ message: `${f.label} is required` });
    if (!event.formLocked) event.formLocked = true;
  }
  const ticketId = generateTicketId();
  const qrCode = await generateQRCode(ticketId, event._id, req.user._id);
  const ticket = await Ticket.create({ ticketId, eventId: event._id, userId: req.user._id, formResponses: formResponses || {}, qrCode,
    amount: event.registrationFee, status: "confirmed", paymentStatus: event.registrationFee > 0 ? "pending" : "not-required" });
  event.registrationCount += 1; event.revenue += event.registrationFee; await event.save();
  const user = await User.findById(req.user._id);
  try { await sendTicketEmail(user, event, ticket); } catch (e) { console.error("Email sending failed:", e); }
  res.status(201).json({ message: "Registration successful! Check your email for the ticket.", ticket: await Ticket.findById(ticket._id).populate("eventId") });
});

export const purchaseMerchandise = wrap(async (req, res) => {
  const { variantId, quantity = 1 } = req.body;
  const event = await Event.findById(req.params.id);
  if (!event || event.eventType !== "merchandise") return res.status(404).json({ message: "Merchandise event not found" });
  if (event.status !== "published" && event.status !== "ongoing") return res.status(400).json({ message: "Event is not open for purchase" });
  if (new Date() > new Date(event.registrationDeadline)) return res.status(400).json({ message: "Purchase deadline has passed" });
  if (event.eligibility === "iiit-only" && req.user.participantType !== "iiit") return res.status(403).json({ message: "This merchandise is only for IIIT participants" });
  if (event.eligibility === "non-iiit-only" && req.user.participantType === "iiit") return res.status(403).json({ message: "This merchandise is only for Non-IIIT participants" });
  const variant = event.variants.id(variantId);
  if (!variant) return res.status(404).json({ message: "Variant not found" });
  if (variant.stock < quantity) return res.status(400).json({ message: "Insufficient stock" });
  const existing = await Ticket.countDocuments({ eventId: event._id, userId: req.user._id, status: { $ne: "cancelled" } });
  if (existing + quantity > event.purchaseLimitPerUser) return res.status(400).json({ message: `Purchase limit is ${event.purchaseLimitPerUser} per user` });
  const ticketId = generateTicketId();
  const qrCode = await generateQRCode(ticketId, event._id, req.user._id);
  const ticket = await Ticket.create({ ticketId, eventId: event._id, userId: req.user._id, variant: { size: variant.size, color: variant.color },
    quantity, qrCode, amount: variant.price * quantity, status: "confirmed" });
  variant.stock -= quantity; event.registrationCount += 1; event.revenue += variant.price * quantity; await event.save();
  await sendTicketEmail(req.user, event, ticket);
  res.status(201).json({ message: "Purchase successful", ticket });
});

export const getMyEvents = wrap(async (req, res) => {
  const query = { userId: req.user._id };
  if (req.query.status) query.status = req.query.status;
  const tickets = await Ticket.find(query).populate({ path: "eventId", populate: { path: "organizerId", select: "name logo" } }).sort({ createdAt: -1 });
  const now = new Date(), upcoming = [], completed = [], cancelled = [], merchandise = [];
  tickets.forEach(t => {
    if (!t.eventId) return;
    if (t.status === "cancelled" || t.status === "rejected") cancelled.push(t);
    else if (t.eventId.eventType === "merchandise") merchandise.push(t);
    else if (new Date(t.eventId.endDate) < now) completed.push(t);
    else upcoming.push(t);
  });
  res.json({ upcoming, completed, cancelled, merchandise });
});

export const getTicketById = wrap(async (req, res) => {
  const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
    .populate({ path: "eventId", populate: { path: "organizerId", select: "name logo" } })
    .populate("userId", "firstName lastName email")
    .populate("teamId", "name");
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.userId._id.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized to view this ticket" });
  res.json(ticket);
});

export const cancelRegistration = wrap(async (req, res) => {
  const ticket = await Ticket.findById(req.params.ticketId).populate("eventId");
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized to cancel this ticket" });
  if (ticket.status === "cancelled") return res.status(400).json({ message: "Ticket already cancelled" });
  if (new Date() > new Date(ticket.eventId.startDate)) return res.status(400).json({ message: "Cannot cancel after event has started" });
  ticket.status = "cancelled"; await ticket.save();
  await Event.findByIdAndUpdate(ticket.eventId._id, { $inc: { registrationCount: -1 } });
  res.json({ message: "Registration cancelled successfully", ticket });
});

export const getInterestsOptions = wrap(async (req, res) => {
  res.json({ areasOfInterest: AREAS_OF_INTEREST });
});
