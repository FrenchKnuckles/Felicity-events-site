import { Attendance, AttendanceAudit } from "../models/Attendance.js";
import Ticket from "../models/Ticket.js";
import Event from "../models/Event.js";
import { Parser } from "json2csv";
import { wrap } from "../middleware/error.js";

const logAudit = (aid, action, by, details, ip) => AttendanceAudit.create({ attendance: aid, action, performedBy: by, details, ip });

export const scanQRCheckIn = wrap(async (req, res) => {
  const { eventId } = req.params;
  const orgId = req.organizer.id;
  let parsed; try { parsed = JSON.parse(req.body.qrData); } catch { return res.status(400).json({ message: "Invalid QR code format" }); }
  const ticket = await Ticket.findOne({ ticketId: parsed.ticketId, eventId }).populate("userId", "firstName lastName email contactNumber");
  if (!ticket) return res.status(404).json({ message: "Invalid ticket - not found" });
  if (ticket.status === "cancelled") return res.status(400).json({ message: "This ticket has been cancelled" });
  const existing = await Attendance.findOne({ event: eventId, ticket: ticket._id });
  if (existing) {
    existing.duplicateScanAttempts.push({ attemptTime: new Date(), scannedBy: orgId }); await existing.save();
    await logAudit(existing._id, "duplicate_attempt", orgId, { attemptTime: new Date() }, req.ip);
    return res.status(409).json({ message: "Duplicate scan - participant already checked in", attendance: { checkInTime: existing.checkInTime, participant: ticket.userId } });
  }
  const att = new Attendance({ event: eventId, ticket: ticket._id, participant: ticket.userId._id, checkInTime: new Date(), checkInMethod: "qr_scan", scannedBy: orgId, deviceInfo: { userAgent: req.headers["user-agent"], ip: req.ip } });
  await att.save();
  ticket.attended = true; ticket.attendanceTimestamp = new Date(); await ticket.save();
  await logAudit(att._id, "check_in", orgId, { method: "qr_scan" }, req.ip);
  res.json({ message: "Check-in successful", attendance: { _id: att._id, checkInTime: att.checkInTime, participant: ticket.userId, method: att.checkInMethod } });
});

export const manualCheckIn = wrap(async (req, res) => {
  const { eventId } = req.params;
  const { ticketId, reason } = req.body;
  const orgId = req.organizer.id;
  if (!reason || reason.trim().length < 10) return res.status(400).json({ message: "Override reason must be at least 10 characters" });
  const ticket = await Ticket.findOne({ _id: ticketId, eventId }).populate("userId", "firstName lastName email contactNumber");
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  const existing = await Attendance.findOne({ event: eventId, ticket: ticket._id });
  if (existing) return res.status(409).json({ message: "Participant already checked in", attendance: existing });
  const att = new Attendance({ event: eventId, ticket: ticket._id, participant: ticket.userId._id, checkInTime: new Date(), checkInMethod: "manual_override", scannedBy: orgId, overrideReason: reason, overrideApprovedBy: orgId, deviceInfo: { userAgent: req.headers["user-agent"], ip: req.ip } });
  await att.save();
  ticket.attended = true; ticket.attendanceTimestamp = new Date(); await ticket.save();
  await logAudit(att._id, "manual_override", orgId, { reason, ticketId }, req.ip);
  res.json({ message: "Manual check-in successful", attendance: { _id: att._id, checkInTime: att.checkInTime, participant: ticket.userId, method: att.checkInMethod, overrideReason: reason } });
});

export const getAttendanceDashboard = wrap(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ message: "Event not found" });
  const stats = await Attendance.getEventStats(eventId);
  const totalRegistered = await Ticket.countDocuments({ eventId, status: { $ne: "cancelled" } });
  const recentCheckIns = await Attendance.find({ event: eventId }).populate("participant", "firstName lastName email").sort({ checkInTime: -1 }).limit(10);
  const checkedInIds = await Attendance.find({ event: eventId }).distinct("ticket");
  const notScanned = await Ticket.find({ eventId, _id: { $nin: checkedInIds }, status: { $ne: "cancelled" } }).populate("userId", "firstName lastName email contactNumber").limit(50);
  const hourlyStats = await Attendance.aggregate([
    { $match: { event: event._id } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d %H:00", date: "$checkInTime" } }, count: { $sum: 1 } } },
    { $sort: { _id: -1 } }, { $limit: 8 },
  ]);
  res.json({
    event: { _id: event._id, name: event.name },
    stats: { totalRegistered, checkedIn: stats.total, notCheckedIn: totalRegistered - stats.total,
      checkInRate: totalRegistered > 0 ? ((stats.total / totalRegistered) * 100).toFixed(1) : 0, byMethod: stats.byMethod },
    recentCheckIns: recentCheckIns.map(a => ({ _id: a._id, participant: a.participant, checkInTime: a.checkInTime, method: a.checkInMethod })),
    notScanned: notScanned.map(t => ({ ticketId: t._id, participant: t.userId })),
    hourlyStats: hourlyStats.reverse(),
  });
});

export const exportAttendanceCSV = wrap(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ message: "Event not found" });
  const attendance = await Attendance.find({ event: eventId }).populate("participant", "firstName lastName email contactNumber collegeOrg").populate("scannedBy", "name");
  const mapRow = (p, a, status) => ({ Name: p ? `${p.firstName} ${p.lastName}` : "N/A", Email: p?.email || "N/A", Phone: p?.contactNumber || "N/A", College: p?.collegeOrg || "N/A",
    "Check-In Time": a?.checkInTime?.toISOString() || "", Method: a?.checkInMethod || "", "Scanned By": a?.scannedBy?.name || "", "Override Reason": a?.overrideReason || "", Status: status });
  let allData = attendance.map(a => mapRow(a.participant, a, "Checked In"));
  if (req.query.includeNotCheckedIn === "true") {
    const checkedIds = attendance.map(a => a.ticket);
    const notChecked = await Ticket.find({ eventId, _id: { $nin: checkedIds }, status: { $ne: "cancelled" } }).populate("userId", "firstName lastName email contactNumber collegeOrg");
    allData = [...allData, ...notChecked.map(t => mapRow(t.userId, null, "Not Checked In"))];
  }
  if (!allData.length) return res.status(404).json({ message: "No attendance data found" });
  const csv = new Parser().parse(allData);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="attendance_${event.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

export const getAuditLogs = wrap(async (req, res) => {
  const { eventId } = req.params;
  const { limit = 50, page = 1 } = req.query;
  const aids = await Attendance.find({ event: eventId }).distinct("_id");
  const total = await AttendanceAudit.countDocuments({ attendance: { $in: aids } });
  const logs = await AttendanceAudit.find({ attendance: { $in: aids } }).populate("performedBy", "name")
    .populate({ path: "attendance", populate: { path: "participant", select: "firstName lastName email" } })
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
});

export const searchParticipant = wrap(async (req, res) => {
  const { eventId } = req.params;
  const { query } = req.query;
  if (!query || query.length < 2) return res.status(400).json({ message: "Search query must be at least 2 characters" });
  const tickets = await Ticket.find({ eventId, status: { $ne: "cancelled" } }).populate({
    path: "userId", match: { $or: [{ firstName: { $regex: query, $options: "i" } }, { lastName: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }] },
    select: "firstName lastName email contactNumber" });
  const matched = tickets.filter(t => t.userId);
  const checkedSet = new Set((await Attendance.find({ event: eventId }).distinct("ticket")).map(id => id.toString()));
  res.json({ results: matched.map(t => ({ ticketId: t._id, participant: t.userId, isCheckedIn: checkedSet.has(t._id.toString()) })) });
});
