import { resolve } from "node:path";

import express, { Request, Response } from "express";
import { config } from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";

import {
  GlobalErrorHanlder,
  logger,
  requestLogger,
  RouteNotFound,
  successResponse,
} from "packages";

const app = express();

config({ path: resolve(".env"), override: true });
config({ path: resolve("../../.env"), override: true });

app.use(helmet());
app.use(cookieParser());
app.use(compression());
app.use(
  cors({
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    origin: "http://localhost:3000",
  }),
);

app.use(requestLogger);

const PORT = process.env.API_GATEWAY;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: true, // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

app.use(limiter);

// User Proxy from *9000 -> *9001
app.use(
  "/user",
  createProxyMiddleware<Request, Response>({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/user${path}`,
  }),
);

app.use("/api-gateway/health", (_req, res) => {
  return successResponse(res, "Working fine");
});

app.use("/{*splat}", (req, _res) => {
  throw new RouteNotFound(`Can't find ${req.originalUrl} on server`);
});

app.use(GlobalErrorHanlder);

app.listen(PORT, () => logger.info(`Api Gateway is running on port ` + PORT));
