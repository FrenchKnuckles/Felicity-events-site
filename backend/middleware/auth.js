import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organizer from "../models/Organizer.js";

const authFactory = (opts = {}) => async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer") ? req.headers.authorization.split(" ")[1] : null;
  if (!token) { if (opts.optional) return next(); return res.status(401).json({ message: "Not authorized, no token" }); }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User not found" });
    if (opts.role && req.user.role !== opts.role) return res.status(403).json({ message: `Access denied. ${opts.role}s only.` });
    if (opts.role === "organizer") {
      const org = req.user.organizerId ? await Organizer.findById(req.user.organizerId) : await Organizer.findOne({ userId: req.user._id });
      if (!org) return res.status(401).json({ message: "Organizer profile not found" });
      if (!org.isActive) return res.status(403).json({ message: "Organizer account is not active" });
      req.organizer = org;
    }
    next();
  } catch (e) { if (opts.optional) { req.user = null; return next(); } res.status(401).json({ message: "Not authorized, token failed" }); }
};

export const protect = authFactory();
export const optionalAuth = authFactory({ optional: true });
export const authenticateParticipant = authFactory({ role: "participant" });
export const authenticateOrganizer = authFactory({ role: "organizer" });
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: `Role '${req.user.role}' is not authorized` });
  next();
};
export const generateToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
