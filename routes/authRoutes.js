import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { client } from "../dbConfig.js";

const router = express.Router();
const db = client.db("express");
const Users = db.collection("users");

// ---------------- NODEMAILER ----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "nop96826@gmail.com",
    pass: "qysv wpxs cwsf reyr", // Gmail app password
  },
});

// ---------------- REGISTER ----------------
router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, email, password, phone } = req.body;
    if (!firstname || !lastname || !email || !password || !phone) {
      return res.status(400).json({ status: 0, message: "All fields required" });
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

    res.status(201).json({ status: 1, message: "User registered successfully" });
  } catch (err) {
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
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ status: 0, message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.json({ status: 1, message: "Login successful", token });
  } catch {
    res.status(500).json({ status: 0, message: "Login failed" });
  }
});

// ---------------- FORGOT PASSWORD ----------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await Users.findOne({ email: email.toLowerCase() });

    if (!user) return res.json({ status: 0, message: "Email not registered" });

    // Step 1: Send OTP
    if (!otp && !newPassword) {
      const newOtp = Math.floor(100000 + Math.random() * 900000);
      const expiry = new Date(Date.now() + 5 * 60 * 1000);

      await Users.updateOne(
        { email: email.toLowerCase() },
        { $set: { otp: newOtp, otpExpiry: expiry } }
      );

      await transporter.sendMail({
        from: '"My App" <nop96826@gmail.com>',
        to: email,
        subject: "Password Reset OTP",
        html: `<h3>Your OTP is: ${newOtp}</h3><p>Expires in 5 minutes.</p>`,
      });

      return res.json({ status: 1, message: "OTP sent to email" });
    }

    // Step 2: Reset Password
    if (otp && newPassword) {
      if (!user.otp || !user.otpExpiry || new Date() > new Date(user.otpExpiry)) {
        return res.json({ status: 0, message: "OTP invalid or expired" });
      }

      if (parseInt(otp) !== user.otp) {
        return res.json({ status: 0, message: "Incorrect OTP" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await Users.updateOne(
        { email: email.toLowerCase() },
        { $set: { password: hashedPassword, otp: null, otpExpiry: null } }
      );

      return res.json({ status: 1, message: "Password reset successful" });
    }

    res.json({ status: 0, message: "Invalid request" });
  } catch {
    res.status(500).json({ status: 0, message: "Error in forgot password" });
  }
});

export default router;
