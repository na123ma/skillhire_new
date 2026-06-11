require("dotenv").config();

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const createAdmin = require("./seedAdmin");

const violationRoutes =
require(
"./routes/violationRoutes"
);

const adminRoutes =
require("./routes/adminRoutes");

const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");

const app = express();

connectDB().then(() => createAdmin()).catch((error) => {
  console.error("Failed to initialize admin seed:", error.message || error);
});

const allowedOrigins = [
  "https://ecstasyskillhire.netlify.app",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 204
}));
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});

app.use(limiter);

app.use("/api/auth", authRoutes);

app.use("/api/exam", examRoutes);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
"/api/violation",
violationRoutes
);

app.get("/", (req, res) => {
  res.json({
    message: "SkillHire Backend Running"
  });
});

const errorMiddleware = require("./middleware/errorMiddleware");

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "::", () => {
  console.log(`Server running on ${PORT}`);
});
