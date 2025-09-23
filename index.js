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

// ✅ Connect MongoDB
client.connect()
  .then(() => console.log("✅ Connected to MongoDB!"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const app = express();

// ✅ Allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://buy-it-frontend.vercel.app",
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

app.use(express.json());
app.use(cookieParser());

// ✅ Public routes
app.use(authRoutes);

// ✅ Auth middleware
function verifyToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ status: 0, message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: 0, message: "Invalid Token" });
  }
}

// ✅ Protected routes
app.use("/users", verifyToken, userRoutes);

// ❌ Remove app.listen() for Vercel
// app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

// ✅ Export as serverless function
export const handler = serverless(app);
