import mongoose from "mongoose";

const organizerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organizer name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["club", "council", "fest-team", "other"],
    },
    description: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      lowercase: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    // Discord webhook for auto-posting events
    discordWebhook: {
      type: String,
      trim: true,
    },
    // Associated user account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Organizer = mongoose.model("Organizer", organizerSchema);
export default Organizer;
