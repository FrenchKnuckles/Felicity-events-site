import { Attendance, AttendanceAudit } from "../models/Attendance.js";
import Ticket from "../models/Ticket.js";
import Event from "../models/Event.js";
import { Parser } from "json2csv";

// Scan QR code and check-in participant
export const scanQRCheckIn = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { qrData } = req.body;
    const organizerId = req.organizer.id;

    // Parse QR data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ message: "Invalid QR code format" });
    }

    // Find ticket
    const ticket = await Ticket.findOne({
      ticketId: parsedData.ticketId,
      eventId: eventId,
    }).populate("userId", "firstName lastName email contactNumber");

    if (!ticket) {
      return res.status(404).json({ message: "Invalid ticket - not found" });
    }

    if (ticket.status === "cancelled") {
      return res.status(400).json({ message: "This ticket has been cancelled" });
    }

    // Check for duplicate scan
    const existingAttendance = await Attendance.findOne({
      event: eventId,
      ticket: ticket._id,
    });

    if (existingAttendance) {
      // Log duplicate attempt
      existingAttendance.duplicateScanAttempts.push({
        attemptTime: new Date(),
        scannedBy: organizerId,
      });
      await existingAttendance.save();

      // Log audit
      await AttendanceAudit.create({
        attendance: existingAttendance._id,
        action: "duplicate_attempt",
        performedBy: organizerId,
        details: { attemptTime: new Date() },
        ip: req.ip,
      });

      return res.status(409).json({
        message: "Duplicate scan - participant already checked in",
        attendance: {
          checkInTime: existingAttendance.checkInTime,
          participant: ticket.userId,
        },
      });
    }

    // Create attendance record
    const attendance = new Attendance({
      event: eventId,
      ticket: ticket._id,
      participant: ticket.userId._id,
      checkInTime: new Date(),
      checkInMethod: "qr_scan",
      scannedBy: organizerId,
      deviceInfo: {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      },
    });

    await attendance.save();

    // Update ticket status
    ticket.attended = true;
    ticket.attendanceTimestamp = new Date();
    await ticket.save();

    // Log audit
    await AttendanceAudit.create({
      attendance: attendance._id,
      action: "check_in",
      performedBy: organizerId,
      details: { method: "qr_scan" },
      ip: req.ip,
    });

    res.json({
      message: "Check-in successful",
      attendance: {
        _id: attendance._id,
        checkInTime: attendance.checkInTime,
        participant: ticket.userId,
        method: attendance.checkInMethod,
      },
    });
  } catch (error) {
    console.error("QR Check-in error:", error);
    res.status(500).json({ message: "Check-in failed", error: error.message });
  }
};

// Manual override check-in
export const manualCheckIn = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketId, reason } = req.body;
    const organizerId = req.organizer.id;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        message: "Override reason must be at least 10 characters",
      });
    }

    const ticket = await Ticket.findOne({
      _id: ticketId,
      eventId: eventId,
    }).populate("userId", "firstName lastName email contactNumber");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check for existing attendance
    const existingAttendance = await Attendance.findOne({
      event: eventId,
      ticket: ticket._id,
    });

    if (existingAttendance) {
      return res.status(409).json({
        message: "Participant already checked in",
        attendance: existingAttendance,
      });
    }

    // Create attendance with manual override
    const attendance = new Attendance({
      event: eventId,
      ticket: ticket._id,
      participant: ticket.userId._id,
      checkInTime: new Date(),
      checkInMethod: "manual_override",
      scannedBy: organizerId,
      overrideReason: reason,
      overrideApprovedBy: organizerId,
      deviceInfo: {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      },
    });

    await attendance.save();

    // Update ticket
    ticket.attended = true;
    ticket.attendanceTimestamp = new Date();
    await ticket.save();

    // Log audit
    await AttendanceAudit.create({
      attendance: attendance._id,
      action: "manual_override",
      performedBy: organizerId,
      details: { reason, ticketId },
      ip: req.ip,
    });

    res.json({
      message: "Manual check-in successful",
      attendance: {
        _id: attendance._id,
        checkInTime: attendance.checkInTime,
        participant: ticket.userId,
        method: attendance.checkInMethod,
        overrideReason: reason,
      },
    });
  } catch (error) {
    console.error("Manual check-in error:", error);
    res.status(500).json({ message: "Manual check-in failed", error: error.message });
  }
};

// Get live attendance dashboard data
export const getAttendanceDashboard = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Get event with registration count
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get attendance stats
    const attendanceStats = await Attendance.getEventStats(eventId);

    // Get total registered
    const totalRegistered = await Ticket.countDocuments({
      eventId: eventId,
      status: { $ne: "cancelled" },
    });

    // Get recent check-ins
    const recentCheckIns = await Attendance.find({ event: eventId })
      .populate("participant", "firstName lastName email")
      .sort({ checkInTime: -1 })
      .limit(10);

    // Get not-yet-scanned participants
    const checkedInTicketIds = await Attendance.find({ event: eventId }).distinct("ticket");
    const notScanned = await Ticket.find({
      eventId: eventId,
      _id: { $nin: checkedInTicketIds },
      status: { $ne: "cancelled" },
    })
      .populate("userId", "firstName lastName email contactNumber")
      .limit(50);

    // Calculate check-in rate by hour (for the last 8 hours)
    const hourlyStats = await Attendance.aggregate([
      { $match: { event: event._id } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d %H:00", date: "$checkInTime" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 8 },
    ]);

    res.json({
      event: {
        _id: event._id,
        name: event.name,
      },
      stats: {
        totalRegistered,
        checkedIn: attendanceStats.total,
        notCheckedIn: totalRegistered - attendanceStats.total,
        checkInRate: totalRegistered > 0 ? ((attendanceStats.total / totalRegistered) * 100).toFixed(1) : 0,
        byMethod: attendanceStats.byMethod,
      },
      recentCheckIns: recentCheckIns.map((a) => ({
        _id: a._id,
        participant: a.participant,
        checkInTime: a.checkInTime,
        method: a.checkInMethod,
      })),
      notScanned: notScanned.map((t) => ({
        ticketId: t._id,
        participant: t.userId,
      })),
      hourlyStats: hourlyStats.reverse(),
    });
  } catch (error) {
    console.error("Get attendance dashboard error:", error);
    res.status(500).json({ message: "Failed to get dashboard", error: error.message });
  }
};

// Export attendance report as CSV
export const exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { includeNotCheckedIn } = req.query;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get all attendance records
    const attendance = await Attendance.find({ event: eventId })
      .populate("participant", "firstName lastName email contactNumber collegeOrg")
      .populate("scannedBy", "name");

    const checkedInData = attendance.map((a) => ({
      Name: a.participant ? `${a.participant.firstName} ${a.participant.lastName}` : "N/A",
      Email: a.participant?.email || "N/A",
      Phone: a.participant?.contactNumber || "N/A",
      College: a.participant?.collegeOrg || "N/A",
      "Check-In Time": a.checkInTime?.toISOString() || "N/A",
      Method: a.checkInMethod,
      "Scanned By": a.scannedBy?.name || "N/A",
      "Override Reason": a.overrideReason || "",
      Status: "Checked In",
    }));

    let allData = checkedInData;

    // Include not checked in participants if requested
    if (includeNotCheckedIn === "true") {
      const checkedInTicketIds = attendance.map((a) => a.ticket);
      const notCheckedIn = await Ticket.find({
        eventId: eventId,
        _id: { $nin: checkedInTicketIds },
        status: { $ne: "cancelled" },
      }).populate("userId", "firstName lastName email contactNumber collegeOrg");

      const notCheckedInData = notCheckedIn.map((t) => ({
        Name: t.userId ? `${t.userId.firstName} ${t.userId.lastName}` : "N/A",
        Email: t.userId?.email || "N/A",
        Phone: t.userId?.contactNumber || "N/A",
        College: t.userId?.collegeOrg || "N/A",
        "Check-In Time": "",
        Method: "",
        "Scanned By": "",
        "Override Reason": "",
        Status: "Not Checked In",
      }));

      allData = [...checkedInData, ...notCheckedInData];
    }

    if (allData.length === 0) {
      return res.status(404).json({ message: "No attendance data found" });
    }

    const parser = new Parser();
    const csv = parser.parse(allData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_${event.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error("Export attendance CSV error:", error);
    res.status(500).json({ message: "Failed to export CSV", error: error.message });
  }
};

// Get attendance audit logs
export const getAuditLogs = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Get attendance IDs for this event
    const attendanceIds = await Attendance.find({ event: eventId }).distinct("_id");

    const total = await AttendanceAudit.countDocuments({
      attendance: { $in: attendanceIds },
    });

    const logs = await AttendanceAudit.find({
      attendance: { $in: attendanceIds },
    })
      .populate("performedBy", "name")
      .populate({
        path: "attendance",
        populate: { path: "participant", select: "firstName lastName email" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ message: "Failed to get audit logs", error: error.message });
  }
};

// Search participant for manual check-in
export const searchParticipant = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const tickets = await Ticket.find({
      eventId: eventId,
      status: { $ne: "cancelled" },
    }).populate({
      path: "userId",
      match: {
        $or: [
          { firstName: { $regex: query, $options: "i" } },
          { lastName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      },
      select: "firstName lastName email contactNumber",
    });

    // Filter out tickets where user didn't match
    const matchedTickets = tickets.filter((t) => t.userId);

    // Check which ones are already checked in
    const checkedInTicketIds = await Attendance.find({ event: eventId }).distinct("ticket");
    const checkedInSet = new Set(checkedInTicketIds.map((id) => id.toString()));

    const results = matchedTickets.map((t) => ({
      ticketId: t._id,
      participant: t.userId,
      isCheckedIn: checkedInSet.has(t._id.toString()),
    }));

    res.json({ results });
  } catch (error) {
    console.error("Search participant error:", error);
    res.status(500).json({ message: "Search failed", error: error.message });
  }
};
