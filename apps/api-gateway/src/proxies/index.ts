import { RouteNotFound } from "packages";

import { authGate } from "@src/middleware/authGate";
import { userProxy } from "./userProxy";
import { orgProxy } from "./orgProxy";

export default function forwardProxy(app: any) {
  app.use("/user", authGate, userProxy);

  // The org proxy forwards paths as-is, so without this a browser could reach
  // the service-to-service /internal routes through /org/internal/*.
  app.use("/org/internal", (req: any) => {
    throw new RouteNotFound(`Can't find ${req.originalUrl} on server`);
  });

  app.use("/org", authGate, orgProxy);
}
