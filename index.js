import express from "express";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { client } from "./dbConfig.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cors from "cors";

dotenv.config();

// ✅ Connect to MongoDB
client.connect()
  .then(() => console.log("✅ Connected to MongoDB!"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const app = express();
const port = process.env.PORT || 3001;

// ✅ Allowed origins (add your frontend domains here)
const allowedOrigins = [
  "http://localhost:5173",                // Local Vite dev
  "https://buy-it-frontend.vercel.app",   // Frontend production
];

// ✅ CORS setup
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // allow cookies across domains
  })
);

app.use(express.json());
app.use(cookieParser());

// ✅ Default route (for browser check)
app.get("/", (req, res) => {
  res.send("✅ Backend is running on Vercel!");
});

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

// ✅ Server start
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
