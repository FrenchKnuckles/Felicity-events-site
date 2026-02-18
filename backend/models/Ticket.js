import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // For team events (Tier A)
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    // Registration form responses
    formResponses: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    // Merchandise specific
    variant: {
      size: String,
      color: String,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    // Payment status (for merchandise approval workflow - Tier A)
    paymentStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "not-required"],
      default: "not-required",
    },
    paymentProofUrl: {
      type: String,
    },
    // Ticket status
    status: {
      type: String,
      enum: ["confirmed", "pending", "cancelled", "rejected"],
      default: "confirmed",
    },
    // Attendance tracking (Tier A - QR Scanner)
    attended: {
      type: Boolean,
      default: false,
    },
    attendanceTimestamp: {
      type: Date,
    },
    // QR Code data
    qrCode: {
      type: String,
    },
    // Amount paid
    amount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Ticket = mongoose.model("Ticket", ticketSchema);
export default Ticket;
