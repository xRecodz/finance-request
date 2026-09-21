import cors from "cors";
import express from "express";
import path from "path";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { approvalsRouter } from "./routes/approvals";
import { attachmentsRouter } from "./routes/attachments";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { lpjRouter } from "./routes/lpj";
import { metaRouter } from "./routes/meta";
import { requestsRouter } from "./routes/requests";
import { usersRouter } from "./routes/users";
import { settingsRouter } from "./routes/settings";
import { aiRouter } from "./routes/ai";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  // File lokal (fallback saat R2 belum dikonfigurasi)
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      app: env.APP_NAME,
      env: env.NODE_ENV,
      time: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/meta", metaRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/requests", requestsRouter);
  app.use("/api/approvals", approvalsRouter);
  app.use("/api/attachments", attachmentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api", lpjRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
