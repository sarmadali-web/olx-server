import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI; // ✅ match .env key name exactly

if (!uri) {
  throw new Error("❌ MONGODB_URI not found in environment variables.");
}

export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let isConnected = false;

export async function connectDB() {
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
      console.log("✅ Connected to MongoDB Atlas!");
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err.message);
      throw err;
    }
  }
}
