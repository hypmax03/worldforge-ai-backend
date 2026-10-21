import { ipKeyGenerator, rateLimit } from "express-rate-limit";

export const aiRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
  handler: (_req, res) =>
    res.status(429).json({ message: "Too many AI requests, try again later" }),
});
