import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

const authInputSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  password: z
    .string()
    .refine((password) => {
      const bytes = Buffer.byteLength(password, "utf8");
      return bytes >= 8 && bytes <= 72;
    }),
});

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("worldforge-invalid-login", 10);

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export async function registerUser(req: Request, res: Response) {
  try {
    const parsed = authInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, password } = parsed.data;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });
    const token = generateToken(user.id);

    return res
      .cookie("wf_token", token, authCookieOptions())
      .status(201)
      .json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error during registration" });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const parsed = authInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email });
    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user.id);
    return res
      .cookie("wf_token", token, authCookieOptions())
      .status(200)
      .json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
}

export function logoutUser(_req: Request, res: Response) {
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
  return res
    .clearCookie("wf_token", clearOptions)
    .status(200)
    .json({ message: "Logged out" });
}

export async function getMe(req: Request, res: Response) {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
