import "@src/config/env";

import express, { Request, Response } from "express";
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

import { authGate } from "@src/middleware/authGate";
import * as authController from "@src/controller/authController";

const app = express();

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

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: true, // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

app.use(rateLimiter);

// These 2 routes lives in gateway for instant check.
app.post("/user/login", express.json(), authController.login);
app.post("/user/logout", authController.logout);

// User Proxy from *9000 -> *9001
app.use(
  "/user",
  authGate,
  createProxyMiddleware<Request, Response>({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/user${path}`,
    on: {
      proxyReq: (proxyReq, req) => {
        const userId = req.headers["x-user-id"];

        if (userId) {
          proxyReq.setHeader("x-user-id", userId);
        }
      },
    },
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
