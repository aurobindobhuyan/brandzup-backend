import { Express } from "express";

import { default as userRouter } from "./userRoute";
import { default as internalRouter } from "./internalRoute";

export const router = (app: Express) => {
  app.use("/user", userRouter);

  // Service-to-service only. Not proxied by the gateway, so it is unreachable
  // from outside the cluster.
  app.use("/internal", internalRouter);
};
