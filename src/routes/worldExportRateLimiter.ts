import { ipKeyGenerator, rateLimit } from "express-rate-limit";

export const worldExportRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
  handler: (_req, res) =>
    res.status(429).json({ message: "Too many export requests, try again later" }),
});
