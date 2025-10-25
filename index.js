import express from "express";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { client } from "./dbConfig.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cors from "cors";
import serverless from "serverless-http";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

// ✅ Connect to MongoDB only once
let isConnected = false;

async function connectDB() {
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
      console.log("✅ MongoDB connected");
    } catch (err) {
      console.error("❌ MongoDB connection error:", err);
    }
  }
}

// ✅ Middleware to ensure DB connection
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ✅ Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://buy-it-nu.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ Routes
app.use(authRoutes);

function verifyToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ status: 0, message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ status: 0, message: "Invalid Token" });
  }
}

app.use("/users", verifyToken, userRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Server running successfully ✅" });
});

// ✅ Default export for Vercel
export default serverless(app);
