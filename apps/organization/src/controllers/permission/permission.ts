import { Request, Response } from "express";
import {
  asyncErrorHandler,
  GATEWAY_HEADER_USER_ID,
  OperationalError,
  successResponse,
} from "packages";
import * as services from "./service";

/**
 * Service-to-service. The gateway calls this while selecting a workspace to
 * confirm the user may enter it and to cache their permission on the session.
 */
export const getActivePermission = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const userId = req.headers[GATEWAY_HEADER_USER_ID] as string;
    const { workspaceNanoId } = req.params as { workspaceNanoId: string };

    const permission = await services.getActivePermission({
      userId,
      workspaceNanoId,
    });

    if (!permission) {
      throw new OperationalError(403, "You do not have access to this workspace");
    }

    return successResponse(res, permission);
  },
);
