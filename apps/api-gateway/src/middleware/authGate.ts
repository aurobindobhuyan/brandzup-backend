import { NextFunction, Request, Response } from "express";
import { asyncErrorHandler, OperationalError } from "packages";

import { isPublic } from "@src/auth/publicRoutes";
import { getUserSession } from "@src/utils/redis";

export const authGate = asyncErrorHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    delete req.headers["x-user-id"];

    // This gate is mounted on "/user", so req.path is stripped of that prefix.
    // PUBLIC_ROUTES is declared with full paths, so rebuild the full one.
    // baseUrl is "" when mounted globally, so this works either way.
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

    req.headers["x-user-id"] = session.userId;

    return next();
  },
);
