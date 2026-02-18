import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://fdasfu:halus@cluster.bdwvjim.mongodb.net/?appName=Cluster";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
