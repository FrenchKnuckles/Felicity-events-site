import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import { 
  authRoutes, 
  eventRoutes, 
  organizerRoutes, 
  adminRoutes,
  attendanceRoutes,
} from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/index.js";

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.send("Felicity Backend Running 🚀");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/organizers", organizerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);

// File upload endpoint (Cloudinary proxy)
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return res.status(500).json({ message: "Cloudinary not configured" });
    const b64 = req.file.buffer.toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const fd = new URLSearchParams();
    fd.append("file", dataURI);
    fd.append("upload_preset", "felicity_uploads");
    fd.append("api_key", CLOUDINARY_API_KEY);
    const timestamp = Math.floor(Date.now() / 1000);
    fd.append("timestamp", timestamp);
    const crypto = await import("crypto");
    const sig = crypto.createHash("sha1").update(`timestamp=${timestamp}&upload_preset=felicity_uploads${CLOUDINARY_API_SECRET}`).digest("hex");
    fd.append("signature", sig);
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
    const data = await resp.json();
    if (data.secure_url) return res.json({ url: data.secure_url });
    res.status(400).json({ message: "Upload failed", error: data });
  } catch (e) { console.error("Upload error:", e); res.status(500).json({ message: "Upload failed" }); }
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// create HTTP server so socket.io can attach
import http from "http";
const server = http.createServer(app);

// initialize socket.io
import { initSocket } from "./utils/socket.js";
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
