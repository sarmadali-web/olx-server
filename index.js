import express from 'express'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { client } from './dbConfig.js';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cors from "cors";

dotenv.config();
client.connect();
console.log("You successfully connected to MongoDB!");

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(cookieParser())

// ✅ Public routes (signup / signin)
app.use(authRoutes)

// ✅ Auth middleware (only for protected routes)
function verifyToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // allow cookie OR bearer
  if (!token) {
    return res.status(401).json({ status: 0, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; // store decoded user
    next();
  } catch (error) {
    return res.status(401).json({ status: 0, message: "Invalid Token", error });
  }
}

// ✅ Protected routes
app.use("/users", verifyToken, userRoutes)

app.listen(port, () => console.log(`Server running on port ${port}`))
