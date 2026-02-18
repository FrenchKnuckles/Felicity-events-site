import User from "../models/User.js";
import Organizer from "../models/Organizer.js";
import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";
import crypto from "crypto";

// Helper to generate random password
const generateRandomPassword = () => {
  return crypto.randomBytes(8).toString("hex");
};

// @desc    Create new organizer (Admin only)
// @route   POST /api/admin/organizers
// @access  Private (Admin)
export const createOrganizer = async (req, res) => {
  try {
    const { name, email, category, description, contactEmail, contactNumber, logo } = req.body;

    // Use email or contactEmail (for flexibility)
    const loginEmail = email || contactEmail;
    const password = generateRandomPassword();

    if (!loginEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: loginEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Create user account for organizer
    const user = await User.create({
      firstName: name,
      lastName: "Organizer",
      email: loginEmail,
      password,
      role: "organizer",
    });

    // Create organizer profile
    const organizer = await Organizer.create({
      name,
      category: category || "club",
      description,
      contactEmail: loginEmail,
      contactNumber,
      logo,
      userId: user._id,
    });

    // Link organizer to user
    user.organizerId = organizer._id;
    await user.save();

    res.status(201).json({
      message: "Organizer created successfully",
      organizer,
      credentials: {
        email: loginEmail,
        password, // Admin should share this with the organizer
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all organizers
// @route   GET /api/admin/organizers
// @access  Private (Admin)
export const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find().populate("userId", "email").lean();

    // Build event counts per organizer
    const eventCounts = await Event.aggregate([
      { $group: { _id: "$organizerId", count: { $sum: 1 } } },
    ]);
    const countsMap = new Map(eventCounts.map((e) => [e._id?.toString(), e.count]));

    const enriched = organizers.map((org) => ({
      ...org,
      eventCount: countsMap.get(org._id.toString()) || 0,
    }));

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get a single organizer by ID
// @route   GET /api/admin/organizers/:id
// @access  Private (Admin)
export const getOrganizerById = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).populate("userId", "email").lean();

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const eventCount = await Event.countDocuments({ organizerId: organizer._id });

    res.json({ ...organizer, eventCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update organizer details
// @route   PUT /api/admin/organizers/:id
// @access  Private (Admin)
export const updateOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const { name, description, logo, category, contactEmail, contactNumber, discordWebhook } = req.body;

    // If email is changing, ensure it's unique across users
    if (contactEmail && contactEmail !== organizer.contactEmail) {
      const existingUser = await User.findOne({ email: contactEmail, _id: { $ne: organizer.userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Update organizer fields if provided
    if (name) organizer.name = name;
    if (description !== undefined) organizer.description = description;
    if (logo !== undefined) organizer.logo = logo;
    if (category) organizer.category = category;
    if (contactEmail) organizer.contactEmail = contactEmail;
    if (contactNumber !== undefined) organizer.contactNumber = contactNumber;
    if (discordWebhook !== undefined) organizer.discordWebhook = discordWebhook;

    await organizer.save();

    // Keep linked user in sync for email and display name
    const user = await User.findById(organizer.userId);
    if (!user) {
      return res.status(404).json({ message: "Linked user not found" });
    }

    if (name) user.firstName = name;
    if (contactEmail) user.email = contactEmail;
    await user.save();

    const updated = await Organizer.findById(organizer._id).populate("userId", "email");
    res.json({ message: "Organizer updated successfully", organizer: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Remove/disable organizer
// @route   DELETE /api/admin/organizers/:id
// @access  Private (Admin)
export const removeOrganizer = async (req, res) => {
  try {
    const { action } = req.query; // 'disable' or 'delete'
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    if (action === "delete") {
      // Permanently delete
      await User.findByIdAndDelete(organizer.userId);
      await Organizer.findByIdAndDelete(organizer._id);
      res.json({ message: "Organizer permanently deleted" });
    } else {
      // Disable (archive)
      organizer.isActive = false;
      await organizer.save();
      res.json({ message: "Organizer disabled successfully" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Enable organizer
// @route   PUT /api/admin/organizers/:id/enable
// @access  Private (Admin)
export const enableOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    organizer.isActive = true;
    await organizer.save();
    res.json({ message: "Organizer enabled successfully", organizer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset an organizer's password and return a temp password
// @route   POST /api/admin/organizers/:id/reset-password
// @access  Private (Admin)
export const resetOrganizerPassword = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const user = await User.findById(organizer.userId);
    if (!user) {
      return res.status(404).json({ message: "Linked user not found" });
    }

    const newPassword = generateRandomPassword();
    user.password = newPassword;
    await user.save();

    res.json({
      message: "Organizer password reset successfully",
      temporaryPassword: newPassword,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all password reset requests
// @route   GET /api/admin/password-requests
// @access  Private (Admin)
export const getPasswordResetRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const requests = await PasswordResetRequest.find(query)
      .populate("organizerId", "name")
      .populate("userId", "email")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Process password reset request
// @route   PUT /api/admin/password-requests/:id
// @access  Private (Admin)
export const processPasswordResetRequest = async (req, res) => {
  try {
    const { action, comment } = req.body; // action: 'approve' or 'reject'
    const request = await PasswordResetRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = action === "approve" ? "approved" : "rejected";
    request.adminComment = comment;
    request.processedAt = new Date();
    request.processedBy = req.user._id;
    await request.save();

    let newPassword = null;
    if (action === "approve") {
      // Generate new password
      newPassword = generateRandomPassword();
      const user = await User.findById(request.userId);
      user.password = newPassword;
      await user.save();
    }

    res.json({
      message: `Request ${action}d successfully`,
      newPassword: action === "approve" ? newPassword : undefined,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getAdminStats = async (req, res) => {
  try {
    const totalOrganizers = await Organizer.countDocuments();
    const activeOrganizers = await Organizer.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ role: "participant" });
    const totalEvents = await Event.countDocuments();
    const pendingRequests = await PasswordResetRequest.countDocuments({ status: "pending" });

    res.json({
      totalOrganizers,
      activeOrganizers,
      totalUsers,
      totalEvents,
      pendingRequests,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all events (admin)
// @route   GET /api/admin/events
// @access  Private (Admin)
export const getAllEventsAdmin = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organizerId", "name")
      .sort({ createdAt: -1 });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete an event (admin)
// @route   DELETE /api/admin/events/:id
// @access  Private (Admin)
export const deleteEventAdmin = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Remove related tickets
    await Ticket.deleteMany({ eventId: event._id });

    await Event.findByIdAndDelete(event._id);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get recent events for admin dashboard
// @route   GET /api/admin/events/recent
// @access  Private (Admin)
export const getRecentEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organizerId", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};