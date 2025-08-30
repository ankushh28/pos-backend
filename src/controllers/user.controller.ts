import { Request, Response } from "express";
import {User} from "../models/user.model";
import { generateToken } from "../utils/jwt";
import { sendMail } from "../utils/mailer";
import crypto from "crypto";

/**
 * Register user
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const user = new User({ email, password });
    await user.save();

    return res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Login with email/password → generate OTP
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
    await user.save();

    // Send OTP email
    await sendMail(user.email, "Your OTP Code", `Your OTP is ${otp}`);

    return res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify OTP → issue JWT
 */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken((user as any)._id.toString());

    return res.status(200).json({ success: true, token });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
