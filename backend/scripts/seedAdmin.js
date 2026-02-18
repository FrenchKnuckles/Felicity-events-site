import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

// Seed admin account - run once on first deployment
const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin account already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Create admin account
    const admin = await User.create({
      firstName: "System",
      lastName: "Admin",
      email: process.env.ADMIN_EMAIL || "admin@felicity.iiit.ac.in",
      password: process.env.ADMIN_PASSWORD || "admin123456",
      role: "admin",
    });

    console.log("✅ Admin account created successfully!");
    console.log("   Email:", admin.email);
    console.log("   Password: (as set in ADMIN_PASSWORD env var)");
    console.log("\n⚠️  IMPORTANT: Change this password immediately after first login!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
