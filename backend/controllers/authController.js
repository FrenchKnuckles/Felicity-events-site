import User from "../models/User.js";
import Organizer from "../models/Organizer.js";
import { generateToken } from "../middleware/auth.js";

// @desc    Register a new participant
// @route   POST /api/auth/register
// @access  Public
export const registerParticipant = async (req, res) => {
  try {
    const { firstName, lastName, email, password, participantType, collegeOrg, contactNumber } = req.body;

    // Validate IIIT email for IIIT participants
    if (participantType === "iiit") {
      const iiitDomains = ["@iiit.ac.in", "@students.iiit.ac.in", "@research.iiit.ac.in", "@faculty.iiit.ac.in"];
      const isValidIIIT = iiitDomains.some((domain) => email.toLowerCase().endsWith(domain));
      if (!isValidIIIT) {
        return res.status(400).json({ message: "IIIT participants must use an IIIT email address" });
      }
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: "participant",
      participantType,
      collegeOrg,
      contactNumber,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        participantType: user.participantType,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password").populate("followedOrganizers", "name category");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if organizer is active
    if (user.role === "organizer") {
      const organizer = await Organizer.findOne({ userId: user._id });
      if (organizer && !organizer.isActive) {
        return res.status(403).json({ message: "Your account has been disabled. Contact admin." });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      participantType: user.participantType,
      organizerId: user.organizerId,
      followedOrganizers: user.followedOrganizers,
      areasOfInterest: user.areasOfInterest,
      contactNumber: user.contactNumber,
      collegeOrg: user.collegeOrg,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("followedOrganizers", "name category");

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      participantType: user.participantType,
      collegeOrg: user.collegeOrg,
      contactNumber: user.contactNumber,
      areasOfInterest: user.areasOfInterest,
      followedOrganizers: user.followedOrganizers,
      organizerId: user.organizerId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user preferences (onboarding)
// @route   PUT /api/auth/preferences
// @access  Private (Participant only)
export const updatePreferences = async (req, res) => {
  try {
    const { areasOfInterest, followedOrganizers } = req.body;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== "participant") {
      return res.status(403).json({ message: "Only participants can update preferences" });
    }

    if (areasOfInterest) user.areasOfInterest = areasOfInterest;
    if (followedOrganizers) user.followedOrganizers = followedOrganizers;

    await user.save();

    res.json({ message: "Preferences updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, collegeOrg, areasOfInterest, followedOrganizers } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (contactNumber) user.contactNumber = contactNumber;
    if (collegeOrg) user.collegeOrg = collegeOrg;
    if (areasOfInterest) user.areasOfInterest = areasOfInterest;
    if (followedOrganizers) user.followedOrganizers = followedOrganizers;

    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
