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
    pass: "qysv wpxs cwsf reyr"},
});

// ---------------- REGISTER ----------------
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    if (!firstName || !lastName || !phone || !email || !password) {
      return res.send("Please fill out complete form");
    }

    let lowerEmail = email.toLowerCase();
    const emailFormat =
      /^[a-zA-Z0-9_.+]+(?<!^[0-9]*)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    const passwordValidation =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    const phoneValidation =
      /^((\+92)|(0092))-{0,1}\d{3}-{0,1}\d{7}$|^\d{11}$|^\d{4}-\d{7}$/;

    if (
      !lowerEmail.match(emailFormat) ||
      !password.match(passwordValidation) ||
      !phone.match(phoneValidation)
    ) {
      return res.send("Invalid email, password or phone");
    }

    const checkUser = await Users.findOne({ email: lowerEmail });
    if (checkUser) {
      return res.send("Email already exist");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      firstName,
      lastName,
      email: lowerEmail,
      password: hashedPassword,
      phone,
      isVerified: false,
      otp: null,
      otpExpiry: null,
    };

    await Users.insertOne(user);
    return res.send("User registered successfully");
  } catch (err) {
    return res.send({
      status: 0,
      message: "Something went wrong",
      error: err,
    });
  }
});

// ---------------- LOGIN + OTP ----------------
router.post("/login", async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!email || !password) {
      return res.send({ status: 0, message: "Email and Password are required" });
    }

    let lowerEmail = email.toLowerCase();
    const user = await Users.findOne({ email: lowerEmail });
    if (!user) {
      return res.send({ status: 0, message: "Email is not registered!" });
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
      return res.send({ status: 0, message: "Email or Password is incorrect" });
    }

    // STEP 1: If no OTP provided, generate + send OTP
    if (!otp) {
      const newOtp = Math.floor(100000 + Math.random() * 900000);
      const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

      await Users.updateOne(
        { email: lowerEmail },
        { $set: { otp: newOtp, otpExpiry: expiry } }
      );

      await transporter.sendMail({
        from: '"My App" <nop96826@gmail.com>',
        to: lowerEmail,
        subject: "Your Login OTP",
        html: `<h3>Your OTP is: ${newOtp}</h3>
               <p>It will expire in 5 minutes.</p>`,
      });

      return res.send({
        status: 0,
        message: "OTP sent to your email",
      });
    }

    // STEP 2: If OTP is provided -> verify
    if (otp) {
      if (!user.otp || !user.otpExpiry) {
        return res.send({
          status: 0,
          message: "No OTP generated, please login again",
        });
      }

      if (new Date() > new Date(user.otpExpiry)) {
        return res.send({ status: 0, message: "OTP has expired, please login again" });
      }

      if (parseInt(otp) !== user.otp) {
        return res.send({ status: 0, message: "Invalid OTP" });
      }

      // Clear OTP after success
      await Users.updateOne(
        { email: lowerEmail },
        { $set: { otp: null, otpExpiry: null, isVerified: true } }
      );

       const token = await jwt.sign({
      email,
      firstName : user.firstName,
    },process.env.SECRET_KEY, { expiresIn: '1h' })

    res.cookie("token", token,{
      httpOnly: true,
      secure : true
    })

      return res.send({
        status: 1,
        message: "Login successful",
        // token,
        data: {
          firstName : user.firstName,
          email : user.email,
        }
      });
    }
  } catch (error) {
    return res.send({
      status: 0,
      message: "Something went wrong",
      error,
    });
  }
});

export default router;
