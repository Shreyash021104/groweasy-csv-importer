import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { leadsRouter } from "./routes/leads.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? "*",
    }),
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", aiProvider: process.env.AI_PROVIDER ?? "heuristic" });
  });

  app.use("/api/leads", leadsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
