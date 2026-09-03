import { NextFunction, Request, Response } from "express";
import {
  asyncErrorHandler,
  GATEWAY_HEADER_USER_ID,
  GATEWAY_TOKEN_HEADER,
  OperationalError,
} from "packages";

import { isPublic } from "@src/auth/publicRoutes";
import { getUserSession } from "@src/utils/redis";
import { createGatewayToken } from "@src/utils/gatewayToken";

export const authGate = asyncErrorHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // Drop anything a client tried to spoof before we sign the request.
    delete req.headers[GATEWAY_HEADER_USER_ID];
    delete req.headers[GATEWAY_TOKEN_HEADER];

    req.headers[GATEWAY_TOKEN_HEADER] = createGatewayToken();
    const path = req.baseUrl + req.path;

    if (isPublic(req.method, path)) return next();

    const deviceId = req.cookies?.deviceId;

    if (!deviceId) {
      throw new OperationalError(401, "Not authenticated");
    }

    const session = await getUserSession(deviceId);

    if (!session) {
      throw new OperationalError(401, "Session expired");
    }

    req.headers[GATEWAY_HEADER_USER_ID] = session.userId;

    return next();
  },
);
