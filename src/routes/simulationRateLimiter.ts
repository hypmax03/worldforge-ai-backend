import { ipKeyGenerator, rateLimit } from "express-rate-limit";

export const simulationRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
  handler: (_req, res) =>
    res.status(429).json({ message: "Too many simulation requests, try again later" }),
});
