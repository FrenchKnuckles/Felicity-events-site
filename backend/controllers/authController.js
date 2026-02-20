import User from "../models/User.js";
import Organizer from "../models/Organizer.js";
import { generateToken } from "../middleware/auth.js";
import { wrap } from "../middleware/error.js";

export const registerParticipant = wrap(async (req, res) => {
  const { firstName, lastName, email, password, participantType, collegeOrg, contactNumber } = req.body;
  if (participantType === "iiit") {
    const domains = ["@iiit.ac.in", "@students.iiit.ac.in", "@research.iiit.ac.in", "@faculty.iiit.ac.in","@clubs.iiit.ac.in"];
    if (!domains.some(d => email.toLowerCase().endsWith(d))) return res.status(400).json({ message: "IIIT participants must use an IIIT email address" });
  }
  if (await User.findOne({ email })) return res.status(400).json({ message: "User already exists with this email" });
  const user = await User.create({ firstName, lastName, email, password, role: "participant", participantType, collegeOrg, contactNumber });
  res.status(201).json({ _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, participantType: user.participantType, token: generateToken(user._id) });
});

export const loginUser = wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password").populate("followedOrganizers", "name category");
  if (!user) return res.status(401).json({ message: "Invalid email or password" });
  if (user.role === "organizer") {
    const org = await Organizer.findOne({ userId: user._id });
    if (org && !org.isActive) return res.status(403).json({ message: "Your account has been disabled. Contact admin." });
  }
  if (!(await user.matchPassword(password))) return res.status(401).json({ message: "Invalid email or password" });
  res.json({ _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role,
    participantType: user.participantType, organizerId: user.organizerId, followedOrganizers: user.followedOrganizers,
    areasOfInterest: user.areasOfInterest, contactNumber: user.contactNumber, collegeOrg: user.collegeOrg, token: generateToken(user._id) });
});

export const getMe = wrap(async (req, res) => {
  const user = await User.findById(req.user._id).populate("followedOrganizers", "name category");
  res.json({ _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role,
    participantType: user.participantType, collegeOrg: user.collegeOrg, contactNumber: user.contactNumber,
    areasOfInterest: user.areasOfInterest, followedOrganizers: user.followedOrganizers, organizerId: user.organizerId });
});

export const updatePreferences = wrap(async (req, res) => {
  const { areasOfInterest, followedOrganizers } = req.body;
  const user = await User.findById(req.user._id);
  if (!user || user.role !== "participant") return res.status(403).json({ message: "Only participants can update preferences" });
  if (areasOfInterest) user.areasOfInterest = areasOfInterest;
  if (followedOrganizers) user.followedOrganizers = followedOrganizers;
  await user.save();
  res.json({ message: "Preferences updated successfully", user });
});

export const updateProfile = wrap(async (req, res) => {
  const { firstName, lastName, contactNumber, collegeOrg, areasOfInterest, followedOrganizers } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (firstName) user.firstName = firstName; if (lastName) user.lastName = lastName;
  if (contactNumber) user.contactNumber = contactNumber; if (collegeOrg) user.collegeOrg = collegeOrg;
  if (areasOfInterest) user.areasOfInterest = areasOfInterest; if (followedOrganizers) user.followedOrganizers = followedOrganizers;
  await user.save();
  res.json({ message: "Profile updated successfully", user });
});

export const changePassword = wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!(await user.matchPassword(currentPassword))) return res.status(401).json({ message: "Current password is incorrect" });
  user.password = newPassword; await user.save();
  res.json({ message: "Password changed successfully" });
});
