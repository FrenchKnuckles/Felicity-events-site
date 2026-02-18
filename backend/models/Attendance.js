import mongoose from "mongoose";

// Attendance model for Tier A - QR Scanner & Attendance Tracking
const attendanceSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    checkInMethod: {
      type: String,
      enum: ["qr_scan", "manual_override", "file_upload"],
      default: "qr_scan",
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
    },
    // For manual override cases
    overrideReason: String,
    overrideApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
    },
    // Device info for audit
    deviceInfo: {
      userAgent: String,
      ip: String,
    },
    // Duplicate scan attempts tracking
    duplicateScanAttempts: [
      {
        attemptTime: Date,
        scannedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Organizer",
        },
      },
    ],
    notes: String,
  },
  { timestamps: true }
);

// Compound index for preventing duplicates
attendanceSchema.index({ event: 1, ticket: 1 }, { unique: true });

// Static method to get attendance stats
attendanceSchema.statics.getEventStats = async function (eventId) {
  const stats = await this.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: "$checkInMethod",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    byMethod: {
      qr_scan: 0,
      manual_override: 0,
      file_upload: 0,
    },
  };

  stats.forEach((s) => {
    result.byMethod[s._id] = s.count;
    result.total += s.count;
  });

  return result;
};

// Audit log for attendance changes
const attendanceAuditSchema = new mongoose.Schema(
  {
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
    },
    action: {
      type: String,
      enum: ["check_in", "manual_override", "duplicate_attempt", "notes_added"],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
    },
    details: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true }
);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
export const AttendanceAudit = mongoose.model("AttendanceAudit", attendanceAuditSchema);
