import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import Organizer from "../models/Organizer.js";
import User from "../models/User.js";
import { generateTicketId, generateQRCode } from "../utils/ticket.js";
import { sendTicketEmail } from "../utils/email.js";
import { AREAS_OF_INTEREST } from "../utils/constants.js";

// @desc    Get all events (with search, filter, pagination)
// @route   GET /api/events
// @access  Public
export const getEvents = async (req, res) => {
  try {
    const {
      search,
      eventType,
      eligibility,
      startDate,
      endDate,
      organizer,
      followed,
      page = 1,
      limit = 12,
      sortBy = "startDate",
    } = req.query;

    let query = { status: { $in: ["published", "ongoing"] } };

    // Search (partial & fuzzy matching on name and organizer)
    if (search) {
      // Find matching organizers first
      const matchingOrganizers = await Organizer.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");
      const organizerIds = matchingOrganizers.map((o) => o._id);

      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
        { organizerId: { $in: organizerIds } },
      ];
    }

    // Filters
    if (eventType) query.eventType = eventType;
    if (eligibility) query.eligibility = eligibility;
    if (organizer) query.organizerId = organizer;

    // Date range filter
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    // Followed clubs filter (requires authenticated user)
    if (followed === "true" && req.user) {
      const user = await User.findById(req.user._id);
      if (user && user.followedOrganizers.length > 0) {
        query.organizerId = { $in: user.followedOrganizers };
      }
    }

    const total = await Event.countDocuments(query);
    
    let events = await Event.find(query)
      .populate("organizerId", "name category")
      .sort({ [sortBy]: sortBy === "registrationDeadline" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // If user is authenticated, boost events matching their interests
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user && user.areasOfInterest && user.areasOfInterest.length > 0) {
        events = events.sort((a, b) => {
          const aMatch = a.tags?.some((tag) => user.areasOfInterest.includes(tag)) ? 1 : 0;
          const bMatch = b.tags?.some((tag) => user.areasOfInterest.includes(tag)) ? 1 : 0;
          return bMatch - aMatch;
        });
      }
    }

    res.json({
      events,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get trending events (top 5 in last 24h)
// @route   GET /api/events/trending
// @access  Public
export const getTrendingEvents = async (req, res) => {
  try {
    // Get registration counts from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentRegistrations = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: twentyFourHoursAgo },
          status: { $in: ["confirmed", "pending"] },
        },
      },
      {
        $group: {
          _id: "$eventId",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    const eventIds = recentRegistrations.map((r) => r._id);
    
    let events;
    if (eventIds.length > 0) {
      events = await Event.find({
        _id: { $in: eventIds },
        status: { $in: ["published", "ongoing"] },
      }).populate("organizerId", "name category");
      
      // Sort by registration count
      const countMap = {};
      recentRegistrations.forEach((r) => {
        countMap[r._id.toString()] = r.count;
      });
      events.sort((a, b) => (countMap[b._id.toString()] || 0) - (countMap[a._id.toString()] || 0));
    } else {
      // Fallback to most recent events
      events = await Event.find({
        status: { $in: ["published", "ongoing"] },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("organizerId", "name category");
    }

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "organizerId",
      "name category description contactEmail"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user has already registered
    let userRegistration = null;
    if (req.user) {
      userRegistration = await Ticket.findOne({
        eventId: event._id,
        userId: req.user._id,
        status: { $ne: "cancelled" },
      });
    }

    res.json({
      ...event.toObject(),
      userRegistered: !!userRegistration,
      userTicket: userRegistration,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Register for an event (Normal)
// @route   POST /api/events/:id/register
// @access  Private (Participant)
export const registerForEvent = async (req, res) => {
  try {
    const { formResponses } = req.body;
    const event = await Event.findById(req.params.id).populate("organizerId");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Validations
    if (event.status !== "published" && event.status !== "ongoing") {
      return res.status(400).json({ message: "Event is not open for registration" });
    }

    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: "Registration deadline has passed" });
    }

    if (event.registrationLimit && event.registrationCount >= event.registrationLimit) {
      return res.status(400).json({ message: "Registration limit reached" });
    }

    // Check eligibility
    if (event.eligibility === "iiit-only" && req.user.participantType !== "iiit") {
      return res.status(403).json({ message: "This event is only for IIIT participants" });
    }
    if (event.eligibility === "non-iiit-only" && req.user.participantType === "iiit") {
      return res.status(403).json({ message: "This event is only for Non-IIIT participants" });
    }

    // Check if already registered
    const existingTicket = await Ticket.findOne({
      eventId: event._id,
      userId: req.user._id,
      status: { $ne: "cancelled" },
    });
    if (existingTicket) {
      return res.status(400).json({ message: "Already registered for this event" });
    }

    // Validate required form fields
    if (event.customForm && event.customForm.length > 0) {
      for (const field of event.customForm) {
        if (field.required && (!formResponses || !formResponses[field.fieldName])) {
          return res.status(400).json({ message: `${field.label} is required` });
        }
      }
      // Lock form after first registration
      if (!event.formLocked) {
        event.formLocked = true;
      }
    }

    // Generate ticket
    const ticketId = generateTicketId();
    const qrCode = await generateQRCode(ticketId, event._id, req.user._id);

    const ticket = await Ticket.create({
      ticketId,
      eventId: event._id,
      userId: req.user._id,
      formResponses: formResponses || {},
      qrCode,
      amount: event.registrationFee,
      status: "confirmed",
      paymentStatus: event.registrationFee > 0 ? "pending" : "not-required",
    });

    // Update event count
    event.registrationCount += 1;
    event.revenue += event.registrationFee;
    await event.save();

    // Get user details for email
    const user = await User.findById(req.user._id);

    // Send email with ticket
    try {
      await sendTicketEmail(user, event, ticket);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(201).json({
      message: "Registration successful! Check your email for the ticket.",
      ticket: await Ticket.findById(ticket._id).populate("eventId"),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Purchase merchandise
// @route   POST /api/events/:id/purchase
// @access  Private (Participant)
export const purchaseMerchandise = async (req, res) => {
  try {
    const { variantId, quantity = 1 } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event || event.eventType !== "merchandise") {
      return res.status(404).json({ message: "Merchandise event not found" });
    }

    // Check event status
    if (event.status !== "published" && event.status !== "ongoing") {
      return res.status(400).json({ message: "Event is not open for purchase" });
    }

    // Check registration deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: "Purchase deadline has passed" });
    }

    // Check eligibility
    if (event.eligibility === "iiit-only" && req.user.participantType !== "iiit") {
      return res.status(403).json({ message: "This merchandise is only for IIIT participants" });
    }
    if (event.eligibility === "non-iiit-only" && req.user.participantType === "iiit") {
      return res.status(403).json({ message: "This merchandise is only for Non-IIIT participants" });
    }

    const variant = event.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // Check purchase limit
    const existingPurchases = await Ticket.countDocuments({
      eventId: event._id,
      userId: req.user._id,
      status: { $ne: "cancelled" },
    });
    if (existingPurchases + quantity > event.purchaseLimitPerUser) {
      return res.status(400).json({ message: `Purchase limit is ${event.purchaseLimitPerUser} per user` });
    }

    // Generate ticket
    const ticketId = generateTicketId();
    const qrCode = await generateQRCode(ticketId, event._id, req.user._id);

    const ticket = await Ticket.create({
      ticketId,
      eventId: event._id,
      userId: req.user._id,
      variant: { size: variant.size, color: variant.color },
      quantity,
      qrCode,
      amount: variant.price * quantity,
      status: "confirmed",
    });

    // Update stock
    variant.stock -= quantity;
    event.registrationCount += 1;
    event.revenue += variant.price * quantity;
    await event.save();

    // Send email
    await sendTicketEmail(req.user, event, ticket);

    res.status(201).json({
      message: "Purchase successful",
      ticket,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user's registered events
// @route   GET /api/events/my-events
// @access  Private (Participant)
export const getMyEvents = async (req, res) => {
  try {
    const { status, eventType } = req.query;

    let query = { userId: req.user._id };
    if (status) query.status = status;

    const tickets = await Ticket.find(query)
      .populate({
        path: "eventId",
        populate: { path: "organizerId", select: "name logo" },
      })
      .sort({ createdAt: -1 });

    // Categorize
    const now = new Date();
    const upcoming = [];
    const completed = [];
    const cancelled = [];
    const merchandise = [];

    tickets.forEach((ticket) => {
      if (!ticket.eventId) return;

      if (ticket.status === "cancelled" || ticket.status === "rejected") {
        cancelled.push(ticket);
      } else if (ticket.eventId.eventType === "merchandise") {
        merchandise.push(ticket);
      } else if (new Date(ticket.eventId.endDate) < now) {
        completed.push(ticket);
      } else {
        upcoming.push(ticket);
      }
    });

    res.json({ upcoming, completed, cancelled, merchandise });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get ticket by ID
// @route   GET /api/events/tickets/:ticketId
// @access  Private (Participant)
export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId)
      .populate({
        path: "eventId",
        populate: { path: "organizerId", select: "name logo" },
      });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check ownership
    if (ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this ticket" });
    }

    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Cancel registration
// @route   PUT /api/events/tickets/:ticketId/cancel
// @access  Private (Participant)
export const cancelRegistration = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId).populate("eventId");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check ownership
    if (ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to cancel this ticket" });
    }

    if (ticket.status === "cancelled") {
      return res.status(400).json({ message: "Ticket already cancelled" });
    }

    // Check if event already started
    if (new Date() > new Date(ticket.eventId.startDate)) {
      return res.status(400).json({ message: "Cannot cancel after event has started" });
    }

    ticket.status = "cancelled";
    await ticket.save();

    // Update event registration count
    await Event.findByIdAndUpdate(ticket.eventId._id, {
      $inc: { registrationCount: -1 },
    });

    res.json({ message: "Registration cancelled successfully", ticket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get interests/preferences options
// @route   GET /api/events/interests
// @access  Public
export const getInterestsOptions = async (req, res) => {
  try {
    res.json({
      areasOfInterest: AREAS_OF_INTEREST,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
