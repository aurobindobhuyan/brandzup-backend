import { NextFunction, Request, Response } from "express";
import {
  asyncErrorHandler,
  GATEWAY_HEADER_PERMISSION,
  GATEWAY_HEADER_USER_ID,
  GATEWAY_HEADER_WORKSPACE_ID,
  GATEWAY_TOKEN_HEADER,
  OperationalError,
} from "packages";

import { isPublic } from "@src/auth/publicRoutes";
import { resolveSession } from "@src/utils/redis";
import { createGatewayToken } from "@src/utils/gatewayToken";

export const authGate = asyncErrorHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // Drop anything a client tried to spoof before we sign the request.
    delete req.headers[GATEWAY_HEADER_USER_ID];
    delete req.headers[GATEWAY_TOKEN_HEADER];

    req.headers[GATEWAY_TOKEN_HEADER] = createGatewayToken();
    const path = req.baseUrl + req.path;

    if (isPublic(req.method, path)) return next();

    const resolved = await resolveSession(req);

    if (!resolved) {
      throw new OperationalError(401, "Session expired");
    }

    const { session } = resolved;

    req.headers[GATEWAY_HEADER_USER_ID] = session.userId;

    if (session[GATEWAY_HEADER_WORKSPACE_ID]) {
      req.headers[GATEWAY_HEADER_WORKSPACE_ID] =
        session[GATEWAY_HEADER_WORKSPACE_ID];
    }

    if (session[GATEWAY_HEADER_PERMISSION]) {
      req.headers[GATEWAY_HEADER_PERMISSION] = JSON.stringify(
        session[GATEWAY_HEADER_PERMISSION],
      );
    }

    return next();
  },
);
