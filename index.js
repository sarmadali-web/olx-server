import express from "express";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { connectDB } from "./dbConfig.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cors from "cors";
import serverless from "serverless-http";

dotenv.config();

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://buy-it-nu.vercel.app", // your frontend URL
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ✅ Connect to MongoDB once (before routes)
await connectDB();

// ✅ Routes
app.use("/api/auth", authRoutes);

// ✅ Token verification middleware
function verifyToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ status: 0, message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ status: 0, message: "Invalid or expired token" });
  }
}

// ✅ Protected routes
app.use("/api/users", verifyToken, userRoutes);

// ✅ Root test route
app.get("/", (req, res) => {
  res.json({ message: "Server running successfully ✅" });
});

// ✅ Export for Vercel
export default serverless(app);
