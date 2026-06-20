import rateLimit from "express-rate-limit";

export const searchSuggestionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
