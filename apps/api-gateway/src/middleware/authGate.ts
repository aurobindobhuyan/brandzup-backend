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
import { resolveSession } from "@src/auth/resolveSession";
import { createGatewayToken } from "@src/utils/gatewayToken";

export const authGate = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Drop anything a client tried to spoof before we sign the request.
    delete req.headers[GATEWAY_HEADER_USER_ID];
    delete req.headers[GATEWAY_HEADER_WORKSPACE_ID];
    delete req.headers[GATEWAY_HEADER_PERMISSION];
    delete req.headers[GATEWAY_TOKEN_HEADER];

    req.headers[GATEWAY_TOKEN_HEADER] = createGatewayToken();
    const path = req.baseUrl + req.path;

    if (isPublic(req.method, path)) return next();

    const session = await resolveSession(req, res);

    if (!session) {
      throw new OperationalError(401, "Not authenticated");
    }

    req.headers[GATEWAY_HEADER_USER_ID] = session.userId;

    if (session.workspaceId) {
      req.headers[GATEWAY_HEADER_WORKSPACE_ID] = session.workspaceId;
    }

    if (session.permission) {
      req.headers[GATEWAY_HEADER_PERMISSION] = JSON.stringify(
        session.permission,
      );
    }

    return next();
  },
);
