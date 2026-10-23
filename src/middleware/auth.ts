import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function protect(req: Request, res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.wf_token;
  if (typeof token !== "string" || token.length === 0) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.id !== "string"
    ) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
    req.user = { ...decoded, id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
}