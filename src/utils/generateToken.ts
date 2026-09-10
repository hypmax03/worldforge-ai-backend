import jwt from "jsonwebtoken";

export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
}