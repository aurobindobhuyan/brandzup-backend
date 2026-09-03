import "@config/env";

import express from "express";

import { connectDB } from "@config/database";
import { router } from "@routes/index";

import {
  GlobalErrorHanlder,
  logger,
  requestLogger,
  RouteNotFound,
} from "packages";

const PORT = process.env.USER_SERVICE_PORT;

const app = express();

app.use(express.json());
app.use(requestLogger);

connectDB();
router(app);

app.use("/{*splat}", (req, _res) => {
  throw new RouteNotFound(`Can't find ${req.originalUrl} on server`);
});

app.use(GlobalErrorHanlder);

app.listen(PORT, () => logger.info("User service is running on:- " + PORT));
