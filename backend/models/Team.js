import mongoose from "mongoose";

// Team model for Tier A - Hackathon Team Registration
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        joinedAt: Date,
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
      required: true,
    },
    maxSize: {
      type: Number,
      required: true,
    },
    minSize: {
      type: Number,
      default: 2,
    },
    status: {
      type: String,
      enum: ["forming", "complete", "incomplete", "cancelled"],
      default: "forming",
    },
    isRegistrationComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to generate unique invite code
teamSchema.statics.generateInviteCode = function () {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing characters
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const Team = mongoose.model("Team", teamSchema);
export default Team;
