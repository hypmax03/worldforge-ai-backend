import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express";

function requestEmail(req: Request): string {
  if (
    typeof req.body === "object" &&
    req.body !== null &&
    "email" in req.body &&
    typeof req.body.email === "string"
  ) {
    return req.body.email.trim().toLowerCase();
  }
  return "";
}

export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: (_req, res) =>
    res.status(429).json({ message: "Too many login attempts, try again later" }),
});

export const loginEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) =>
    requestEmail(req) || ipKeyGenerator(req.ip ?? ""),
  handler: (_req, res) =>
    res.status(429).json({ message: "Too many login attempts, try again later" }),
});

export const registerIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: (_req, res) =>
    res.status(429).json({ message: "Too many registration attempts, try again later" }),
});
