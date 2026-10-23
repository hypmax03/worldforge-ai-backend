import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}