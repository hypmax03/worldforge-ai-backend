import type { NextFunction, Request, Response } from "express";

function containsUnsafeKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsUnsafeKey);
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.entries(value).some(
    ([key, child]) =>
      key.startsWith("$") || key.includes(".") || containsUnsafeKey(child)
  );
}

export function noSqlGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (containsUnsafeKey(req.body)) {
    return res.status(400).json({ message: "Invalid request body" });
  }
  return next();
}
