import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

export async function registerUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ email, passwordHash });

    const token = generateToken(user.id);

    return res.status(201).json({
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error during registration" });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
}