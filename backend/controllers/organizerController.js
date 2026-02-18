import Organizer from "../models/Organizer.js";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import { postToDiscord } from "../utils/discord.js";

// @desc    Get organizer profile
// @route   GET /api/organizers/profile
// @access  Private (Organizer)
export const getOrganizerProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }
    res.json(organizer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update organizer profile
// @route   PUT /api/organizers/profile
// @access  Private (Organizer)
export const updateOrganizerProfile = async (req, res) => {
  try {
    const { name, category, description, contactEmail, contactNumber, discordWebhook } = req.body;

    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    if (name) organizer.name = name;
    if (category) organizer.category = category;
    if (description) organizer.description = description;
    if (contactEmail) organizer.contactEmail = contactEmail;
    if (contactNumber) organizer.contactNumber = contactNumber;
    if (discordWebhook !== undefined) organizer.discordWebhook = discordWebhook;

    await organizer.save();
    res.json({ message: "Profile updated successfully", organizer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get organizer's events
// @route   GET /api/organizers/events
// @access  Private (Organizer)
export const getOrganizerEvents = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const { status } = req.query;
    let query = { organizerId: organizer._id };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const events = await Event.find(query).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get organizer's ongoing events (for navbar)
// @route   GET /api/organizers/events/ongoing
// @access  Private (Organizer)
export const getOngoingEvents = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const events = await Event.find({
      organizerId: organizer._id,
      status: "ongoing",
    })
      .select("name eventType startDate endDate registrationCount")
      .sort({ startDate: 1 });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single event by ID (for editing)
// @route   GET /api/organizers/me/events/:id
// @access  Private (Organizer)
export const getOrganizerEventById = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Verify ownership
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this event" });
    }

    // Populate after ownership check
    await event.populate({ path: "organizerId", select: "name" });

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create new event
// @route   POST /api/organizers/events
// @access  Private (Organizer)
export const createEvent = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const eventData = {
      ...req.body,
      organizerId: organizer._id,
      status: "draft",
    };

    const event = await Event.create(eventData);
    res.status(201).json({ message: "Event created as draft", event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update event
// @route   PUT /api/organizers/events/:id
// @access  Private (Organizer)
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this event" });
    }

    // Editing rules based on status
    if (event.status === "draft") {
      // Free edits allowed, but check if form is locked
      if (event.formLocked && req.body.customForm) {
        return res.status(400).json({ 
          message: "Custom form cannot be edited after first registration" 
        });
      }
      Object.assign(event, req.body);
    } else if (event.status === "published") {
      // Limited edits: description, extend deadline, increase limit
      const { description, registrationDeadline, registrationLimit, status } = req.body;
      if (description) event.description = description;
      if (registrationDeadline && new Date(registrationDeadline) > event.registrationDeadline) {
        event.registrationDeadline = registrationDeadline;
      }
      if (registrationLimit && registrationLimit > event.registrationLimit) {
        event.registrationLimit = registrationLimit;
      }
      if (status === "closed" || status === "ongoing") {
        event.status = status;
      }
    } else if (event.status === "ongoing" || event.status === "completed") {
      // Only status change allowed
      const { status } = req.body;
      if (status === "completed" || status === "closed") {
        event.status = status;
      } else {
        return res.status(400).json({ message: "Only status change allowed for ongoing/completed events" });
      }
    }

    await event.save();
    res.json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Publish event
// @route   PUT /api/organizers/events/:id/publish
// @access  Private (Organizer)
export const publishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.status !== "draft") {
      return res.status(400).json({ message: "Only draft events can be published" });
    }

    event.status = "published";
    await event.save();

    // Post to Discord if webhook configured
    const organizer = await Organizer.findById(event.organizerId);
    if (organizer.discordWebhook) {
      await postToDiscord(organizer.discordWebhook, event);
    }

    res.json({ message: "Event published successfully", event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get event participants
// @route   GET /api/organizers/events/:id/participants
// @access  Private (Organizer)
export const getEventParticipants = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = { eventId: req.params.id };
    if (status) query.status = status;

    const tickets = await Ticket.find(query)
      .populate("userId", "firstName lastName email contactNumber collegeOrg")
      .populate("teamId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Ticket.countDocuments(query);

    // Filter by search if provided
    let results = tickets;
    if (search) {
      const searchLower = search.toLowerCase();
      results = tickets.filter(
        (t) =>
          t.userId.firstName.toLowerCase().includes(searchLower) ||
          t.userId.lastName.toLowerCase().includes(searchLower) ||
          t.userId.email.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      participants: results,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get organizer analytics
// @route   GET /api/organizers/analytics
// @access  Private (Organizer)
export const getOrganizerAnalytics = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const events = await Event.find({ organizerId: organizer._id });
    const completedEvents = events.filter((e) => e.status === "completed");

    // Get attendance stats for completed events
    let totalAttendance = 0;
    for (const event of completedEvents) {
      const attendedCount = await Ticket.countDocuments({
        eventId: event._id,
        attended: true,
      });
      totalAttendance += attendedCount;
    }

    const stats = {
      totalEvents: events.length,
      draftEvents: events.filter((e) => e.status === "draft").length,
      publishedEvents: events.filter((e) => e.status === "published").length,
      ongoingEvents: events.filter((e) => e.status === "ongoing").length,
      completedEvents: completedEvents.length,
      closedEvents: events.filter((e) => e.status === "closed").length,
      totalRegistrations: events.reduce((sum, e) => sum + e.registrationCount, 0),
      totalRevenue: events.reduce((sum, e) => sum + e.revenue, 0),
      // Completed events specific stats
      completedEventsStats: {
        totalRegistrations: completedEvents.reduce((sum, e) => sum + e.registrationCount, 0),
        totalRevenue: completedEvents.reduce((sum, e) => sum + e.revenue, 0),
        totalAttendance,
        averageAttendanceRate:
          completedEvents.length > 0
            ? (
                (totalAttendance /
                  completedEvents.reduce((sum, e) => sum + e.registrationCount, 0)) *
                100
              ).toFixed(1)
            : 0,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Request password reset (Tier B)
// @route   POST /api/organizers/request-password-reset
// @access  Private (Organizer)
export const requestPasswordReset = async (req, res) => {
  try {
    const { reason } = req.body;
    const organizer = await Organizer.findOne({ userId: req.user._id });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Check for existing pending request
    const existingRequest = await PasswordResetRequest.findOne({
      organizerId: organizer._id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "You already have a pending password reset request" });
    }

    const request = await PasswordResetRequest.create({
      organizerId: organizer._id,
      userId: req.user._id,
      reason,
    });

    res.status(201).json({ message: "Password reset request submitted", request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all organizers (Public listing)
// @route   GET /api/organizers
// @access  Public
export const listOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find({ isActive: true }).select("name category description contactEmail");
    res.json(organizers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get organizer by ID (Public)
// @route   GET /api/organizers/:id
// @access  Public
export const getOrganizerById = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ _id: req.params.id, isActive: true }).select("name category description contactEmail");

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    // Get upcoming and past events
    const now = new Date();
    const upcomingEvents = await Event.find({
      organizerId: organizer._id,
      status: { $in: ["published", "ongoing"] },
      startDate: { $gte: now },
    }).select("name eventType startDate");

    const pastEvents = await Event.find({
      organizerId: organizer._id,
      status: "completed",
    }).select("name eventType startDate");

    res.json({ organizer, upcomingEvents, pastEvents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Follow/Unfollow organizer
// @route   POST /api/organizers/:id/follow
// @access  Private (Participant)
export const toggleFollowOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const user = await User.findById(req.user._id);
    const isFollowing = user.followedOrganizers.includes(organizer._id);

    if (isFollowing) {
      user.followedOrganizers = user.followedOrganizers.filter((id) => id.toString() !== organizer._id.toString());
      organizer.followers = organizer.followers.filter((id) => id.toString() !== user._id.toString());
    } else {
      user.followedOrganizers.push(organizer._id);
      organizer.followers.push(user._id);
    }

    await user.save();
    await organizer.save();

    // Return populated followedOrganizers
    await user.populate("followedOrganizers", "name category");

    res.json({
      message: isFollowing ? "Unfollowed successfully" : "Followed successfully",
      isFollowing: !isFollowing,
      followedOrganizers: user.followedOrganizers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Export participants to CSV
// @route   GET /api/organizers/events/:id/export-csv
// @access  Private (Organizer)
export const exportParticipantsCSV = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const tickets = await Ticket.find({ eventId: req.params.id, status: { $ne: "cancelled" } })
      .populate("userId", "firstName lastName email contactNumber collegeOrg participantType")
      .populate("teamId", "name");

    // Build CSV
    const fields = [
      "Ticket ID",
      "First Name",
      "Last Name",
      "Email",
      "Contact Number",
      "College/Org",
      "Participant Type",
      "Team Name",
      "Status",
      "Attendance",
      "Registered At",
    ];

    // Add custom form fields
    if (event.customForm && event.customForm.length > 0) {
      event.customForm.forEach((field) => {
        fields.push(field.label);
      });
    }

    let csv = fields.join(",") + "\n";

    tickets.forEach((ticket) => {
      const row = [
        ticket.ticketId,
        ticket.userId?.firstName || "",
        ticket.userId?.lastName || "",
        ticket.userId?.email || "",
        ticket.userId?.contactNumber || "",
        `"${ticket.userId?.collegeOrg || ""}"`,
        ticket.userId?.participantType || "",
        ticket.teamId?.name || "",
        ticket.status,
        ticket.attended ? "checked-in" : "not-checked",
        new Date(ticket.createdAt).toISOString(),
      ];

      // Add custom form responses
      if (event.customForm && event.customForm.length > 0) {
        event.customForm.forEach((field) => {
          const value = ticket.formResponses?.get(field.fieldName) || ticket.formResponses?.[field.fieldName] || "";
          row.push(`"${String(value).replace(/"/g, '""')}"`);
        });
      }

      csv += row.join(",") + "\n";
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${event.name}-participants.csv"`);
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get event detailed analytics
// @route   GET /api/organizers/events/:id/analytics
// @access  Private (Organizer)
export const getEventAnalytics = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Basic stats
    const totalTickets = await Ticket.countDocuments({ eventId: event._id });
    const confirmedTickets = await Ticket.countDocuments({ eventId: event._id, status: "confirmed" });
    const cancelledTickets = await Ticket.countDocuments({ eventId: event._id, status: "cancelled" });
    const attendedTickets = await Ticket.countDocuments({ eventId: event._id, attended: true });

    // Registration trend (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const registrationTrend = await Ticket.aggregate([
      {
        $match: {
          eventId: event._id,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Participant type breakdown
    const participantBreakdown = await Ticket.aggregate([
      { $match: { eventId: event._id, status: { $ne: "cancelled" } } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $group: {
          _id: "$user.participantType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Team completion stats (if applicable)
    let teamStats = null;
    const Team = (await import("../models/Team.js")).default;
    const teams = await Team.find({ eventId: event._id });
    if (teams.length > 0) {
      const completeTeams = teams.filter((t) => t.status === "complete").length;
      const incompleteTeams = teams.filter((t) => t.status === "incomplete").length;
      teamStats = {
        totalTeams: teams.length,
        completeTeams,
        incompleteTeams,
        completionRate: ((completeTeams / teams.length) * 100).toFixed(1),
      };
    }

    res.json({
      event: {
        name: event.name,
        status: event.status,
        registrationLimit: event.registrationLimit,
        registrationDeadline: event.registrationDeadline,
      },
      stats: {
        totalRegistrations: totalTickets,
        confirmed: confirmedTickets,
        cancelled: cancelledTickets,
        attended: attendedTickets,
        attendanceRate: confirmedTickets > 0 ? ((attendedTickets / confirmedTickets) * 100).toFixed(1) : 0,
        revenue: event.revenue,
      },
      teamStats,
      registrationTrend,
      participantBreakdown,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete draft event
// @route   DELETE /api/organizers/events/:id
// @access  Private (Organizer)
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (event.status !== "draft") {
      return res.status(400).json({ message: "Only draft events can be deleted" });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
