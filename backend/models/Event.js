import mongoose from "mongoose";

// Custom form field schema for dynamic form builder
const formFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  fieldType: {
    type: String,
    enum: ["text", "textarea", "dropdown", "checkbox", "radio", "file", "number", "email", "date"],
    required: true,
  },
  label: { type: String, required: true },
  placeholder: { type: String },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // For dropdown, checkbox, radio
  order: { type: Number, default: 0 },
});

// Merchandise variant schema
const variantSchema = new mongoose.Schema({
  size: { type: String },
  color: { type: String },
  stock: { type: Number, default: 0 },
  price: { type: Number },
});

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
    },
    eventType: {
      type: String,
      enum: ["normal", "merchandise", "hackathon"],
      required: [true, "Event type is required"],
    },
    eligibility: {
      type: String,
      enum: ["all", "iiit-only", "non-iiit-only"],
      default: "all",
    },
    registrationDeadline: {
      type: Date,
      required: [true, "Registration deadline is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    venue: {
      type: String,
      trim: true,
    },
    registrationLimit: {
      type: Number,
      default: null, // null = unlimited
    },
    registrationFee: {
      type: Number,
      default: 0,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
    },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed", "closed"],
      default: "draft",
    },
    // Team registration settings (for hackathons)
    allowTeamRegistration: {
      type: Boolean,
      default: false,
    },
    minTeamSize: {
      type: Number,
      default: 2,
    },
    maxTeamSize: {
      type: Number,
      default: 4,
    },
    registrationType: {
      type: String,
      enum: ["individual", "team", "both"],
      default: "individual",
    },
    // Normal event: custom registration form
    customForm: [formFieldSchema],
    formLocked: {
      type: Boolean,
      default: false,
    },
    // Merchandise event specific
    variants: [variantSchema],
    purchaseLimitPerUser: {
      type: Number,
      default: 1,
    },
    // Analytics
    registrationCount: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
    // Trending calculation
    last24hRegistrations: {
      type: Number,
      default: 0,
    },
    last24hUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
eventSchema.index({ name: "text", description: "text", tags: "text" });

const Event = mongoose.model("Event", eventSchema);
export default Event;
