import mongoose from "mongoose";
import type { RequestHandler } from "express";

export function validateObjectIds(
  ...paramNames: string[]
): RequestHandler {
  return (req, res, next) => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (value !== undefined && !mongoose.isObjectIdOrHexString(value)) {
        return res.status(400).json({ message: "Invalid id" });
      }
    }
    return next();
  };
}
