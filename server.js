// ============================================================
//  server.js — Main Backend Entry Point
//  Geospatial Location Tracking System
//  Stack: Node.js + Express + Socket.io + MongoDB (Mongoose)
// ============================================================

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// ─── App & Server Setup ─────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/geospatial_tracker";

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve frontend files

// ─── MongoDB Connection ──────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅  MongoDB connected:", MONGO_URI))
  .catch((err) => {
    console.error("❌  MongoDB connection error:", err.message);
    console.log("⚠️   Server will run WITHOUT database persistence.");
  });

// ─── Mongoose Schema & Model ─────────────────────────────────
const locationSchema = new mongoose.Schema({
  deviceId:  { type: String, required: true, index: true },
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy:  { type: Number },
  timestamp: { type: Date, default: Date.now },
});

const Location = mongoose.model("Location", locationSchema);

// ─── In-memory: latest position per device ───────────────────
// Used to send current state to newly connecting map clients
const latestPositions = {};

// ─── REST API Routes ─────────────────────────────────────────

// GET /api/history/:deviceId  → last 100 positions for a device
app.get("/api/history/:deviceId", async (req, res) => {
  try {
    const records = await Location.find({ deviceId: req.params.deviceId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/devices  → list all unique device IDs ever seen
app.get("/api/devices", async (req, res) => {
  try {
    const devices = await Location.distinct("deviceId");
    res.json({ success: true, devices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/live  → current in-memory positions of all active devices
app.get("/api/live", (req, res) => {
  res.json({ success: true, data: latestPositions });
});

// DELETE /api/history/:deviceId  → clear history for a device
app.delete("/api/history/:deviceId", async (req, res) => {
  try {
    await Location.deleteMany({ deviceId: req.params.deviceId });
    res.json({ success: true, message: `History cleared for ${req.params.deviceId}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Socket.io Real-Time Events ──────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌  Client connected: ${socket.id}`);

  // ── 1. New map client joins: send it all current device positions ──
  socket.on("join_map", () => {
    console.log(`🗺️   Map client joined: ${socket.id}`);
    // Send snapshot of all currently tracked devices
    Object.values(latestPositions).forEach((pos) => {
      socket.emit("location_update", pos);
    });
  });

  // ── 2. GPS sender emits its location ──────────────────────────────
  socket.on("send_location", async (data) => {
    // Expected data: { deviceId, latitude, longitude, accuracy }
    if (!data || !data.deviceId || !data.latitude || !data.longitude) {
      socket.emit("error", { message: "Invalid location payload" });
      return;
    }

    const payload = {
      deviceId:  data.deviceId,
      latitude:  parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      accuracy:  data.accuracy ? parseFloat(data.accuracy) : null,
      timestamp: new Date().toISOString(),
    };

    // Update in-memory cache
    latestPositions[payload.deviceId] = payload;

    // Broadcast to ALL connected clients (map viewers)
    io.emit("location_update", payload);

    console.log(`📍  [${payload.deviceId}] lat=${payload.latitude.toFixed(5)} lng=${payload.longitude.toFixed(5)}`);

    // Persist to MongoDB (non-blocking — don't await so it doesn't slow the socket)
    if (mongoose.connection.readyState === 1) {
      Location.create({
        deviceId:  payload.deviceId,
        latitude:  payload.latitude,
        longitude: payload.longitude,
        accuracy:  payload.accuracy,
        timestamp: new Date(payload.timestamp),
      }).catch((err) => console.error("DB write error:", err.message));
    }
  });

  // ── 3. Device disconnects ─────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`❌  Client disconnected: ${socket.id}`);
  });
});

// ─── Start Server ─────────────────────────────────────────────
server.listen(PORT, () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Geospatial Tracker — Server Running        ║");
  console.log(`║   http://localhost:${PORT}                       ║`);
  console.log(`║   Map  → http://localhost:${PORT}/map.html        ║`);
  console.log(`║   GPS  → http://localhost:${PORT}/sender.html     ║`);
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");
});
