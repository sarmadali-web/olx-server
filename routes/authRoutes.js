import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { client } from "../dbConfig.js";

const router = express.Router();
const myDB = client.db("express");
const Users = myDB.collection("users");

// ---------------- NODEMAILER CONFIG ----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "nop96826@gmail.com",
    pass: "qysv wpxs cwsf reyr", // app password
  },
});

// ---------------- REGISTER ----------------
router.post("/signup", async (req, res) => {
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
    const newUser = {
      firstname,
      lastname,
      email: lowerEmail,
      password: hashedPassword,
      phone,
      createdAt: new Date(),
    };

    await Users.insertOne(newUser);

    res.status(201).json({ status: 1, message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ status: 0, message: "Something went wrong", error: err });
  }
});

// ---------------- LOGIN ----------------
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 0, message: "Email and password required" });
    }

    const lowerEmail = email.toLowerCase();
    const user = await Users.findOne({ email: lowerEmail });
    if (!user) {
      return res.status(400).json({ status: 0, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 0, message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    // Send token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    res.json({ status: 1, message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ status: 0, message: "Something went wrong", error: err });
  }
});

// ---------------- FORGOT PASSWORD (already built) ----------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email) {
      return res.send({ status: 0, message: "Email is required" });
    }

    let lowerEmail = email.toLowerCase();
    const user = await Users.findOne({ email: lowerEmail });
    if (!user) {
      return res.send({ status: 0, message: "Email is not registered!" });
    }

    if (!otp && !newPassword) {
      const newOtp = Math.floor(100000 + Math.random() * 900000);
      const expiry = new Date(Date.now() + 5 * 60 * 1000);

      await Users.updateOne(
        { email: lowerEmail },
        { $set: { otp: newOtp, otpExpiry: expiry } }
      );

      await transporter.sendMail({
        from: '"My App" <nop96826@gmail.com>',
        to: lowerEmail,
        subject: "Password Reset OTP",
        html: `<h3>Your OTP is: ${newOtp}</h3><p>It will expire in 5 minutes.</p>`,
      });

      return res.send({ status: 1, message: "OTP sent to your email" });
    }

    if (otp && newPassword) {
      if (!user.otp || !user.otpExpiry) {
        return res.send({ status: 0, message: "No OTP generated, please try again" });
      }

      if (new Date() > new Date(user.otpExpiry)) {
        return res.send({ status: 0, message: "OTP has expired, please request again" });
      }

      if (parseInt(otp) !== user.otp) {
        return res.send({ status: 0, message: "Invalid OTP" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await Users.updateOne(
        { email: lowerEmail },
        { $set: { password: hashedPassword, otp: null, otpExpiry: null } }
      );

      return res.send({ status: 1, message: "Password reset successful" });
    }

    return res.send({ status: 0, message: "Invalid request format" });
  } catch (error) {
    return res.send({ status: 0, message: "Something went wrong", error });
  }
});

export default router;
