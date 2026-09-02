import express from "express";
import { resolve } from "node:path";
import { config } from "dotenv";
import cookieParser from "cookie-parser";

import { connectDB } from "@config/database";
import { router } from "@routes/index";

import {
  GlobalErrorHanlder,
  logger,
  requestLogger,
  RouteNotFound,
  successResponse,
} from "packages";

config({ path: resolve(process.cwd(), ".env"), override: true });
config({ path: resolve(process.cwd(), "../../.env"), override: true });

const PORT = process.env.USER_SERVICE_PORT;

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

connectDB();
router(app);

app.use("/user-service/health", (_req, res) => {
  return successResponse(res, "Working fine");
});

app.use("/{*splat}", (req, _res) => {
  throw new RouteNotFound(`Can't find ${req.originalUrl} on server`);
});

app.use(GlobalErrorHanlder);

app.listen(PORT, () => logger.info("User service is running on:- " + PORT));
