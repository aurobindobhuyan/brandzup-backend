import "@config/env";
import express from "express";

import { connectDB } from "@config/database";
import { rootRoute } from "@routes/index";

import {
  GlobalErrorHanlder,
  logger,
  requestLogger,
  RouteNotFound,
  verifyGatewayToken,
} from "packages";

const app = express();

app.use(express.json());
app.use(requestLogger);

connectDB();
app.use(verifyGatewayToken);
rootRoute(app);

const PORT = process.env.ORG_SERVICE_PORT;

app.use("/{*splat}", (req, _res) => {
  throw new RouteNotFound(`Can't find ${req.originalUrl} on server`);
});

app.use(GlobalErrorHanlder);

app.listen(PORT, () => {
  logger.info("Organization is running on port " + PORT);
});
