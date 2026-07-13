const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");

const { PORT, CLIENT_ORIGIN, NODE_ENV } = require("./config/env");
const { apiLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const donorRoutes = require("./routes/donorRoutes");
const volunteerRoutes = require("./routes/volunteerRoutes");
const shelterRoutes = require("./routes/shelterRoutes");
const sosRoutes = require("./routes/sosRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const server = http.createServer(app);

// ---- Real-time layer (SOS live updates, admin dashboard, volunteer app) ----
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] }
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`[socket] client disconnected: ${socket.id}`));
});

// ---- Core middleware ----
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", apiLimiter);

// ---- Health check ----
app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok", env: NODE_ENV, timestamp: new Date().toISOString() });
});

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/pharmacies", pharmacyRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/admin", adminRoutes);

// ---- 404 + error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`MediHelp backend running on port ${PORT} [${NODE_ENV}]`);
});

module.exports = { app, server, io };
