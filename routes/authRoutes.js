import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { client } from "../dbConfig.js";

const router = express.Router();
const db = client.db("express");
const Users = db.collection("users");

// ---------------- REGISTER ----------------
router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, email, password, phone } = req.body;

    if (!firstname || !lastname || !email || !password || !phone) {
      return res.status(400).json({ status: 0, message: "All fields are required" });
    }

    const lowerEmail = email.toLowerCase();
    const existing = await Users.findOne({ email: lowerEmail });

    if (existing) {
      return res.status(400).json({ status: 0, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Users.insertOne({
      firstname,
      lastname,
      email: lowerEmail,
      password: hashedPassword,
      phone,
      createdAt: new Date(),
    });

    res.status(201).json({ status: 1, message: "Registration successful" });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ status: 0, message: "Registration failed" });
  }
});

// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 0, message: "Email and password required" });
    }

    const user = await Users.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ status: 0, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 0, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    // send token as cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    res.json({
      status: 1,
      message: "Login successful",
      user: {
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ status: 0, message: "Login failed" });
  }
});

// ---------------- LOGOUT ----------------
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
  });
  res.json({ status: 1, message: "Logged out successfully" });
});

export default router;
