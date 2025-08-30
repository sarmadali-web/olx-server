import express from "express";
import bcrypt from "bcryptjs";
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

// ---------------- FORGOT PASSWORD (Single Route) ----------------
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

    // STEP 1: If OTP + newPassword not provided → generate OTP and send
    if (!otp && !newPassword) {
      const newOtp = Math.floor(100000 + Math.random() * 900000);
      const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

      await Users.updateOne(
        { email: lowerEmail },
        { $set: { otp: newOtp, otpExpiry: expiry } }
      );

      await transporter.sendMail({
        from: '"My App" <nop96826@gmail.com>',
        to: lowerEmail,
        subject: "Password Reset OTP",
        html: `<h3>Your OTP is: ${newOtp}</h3>
               <p>It will expire in 5 minutes.</p>`,
      });

      return res.send({
        status: 1,
        message: "OTP sent to your email",
      });
    }

    // STEP 2: If OTP + newPassword provided → verify OTP and reset password
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

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user
      await Users.updateOne(
        { email: lowerEmail },
        { $set: { password: hashedPassword, otp: null, otpExpiry: null } }
      );

      return res.send({
        status: 1,
        message: "Password reset successful",
      });
    }

    return res.send({ status: 0, message: "Invalid request format" });
  } catch (error) {
    return res.send({
      status: 0,
      message: "Something went wrong",
      error,
    });
  }
});

export default router;
