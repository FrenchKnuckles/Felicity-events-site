import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI environment variable is required"); process.exit(1); }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
