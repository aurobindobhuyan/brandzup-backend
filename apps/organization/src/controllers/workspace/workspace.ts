import { Request, Response } from "express";
import {
  asyncErrorHandler,
  errorResponse,
  GATEWAY_HEADER_USER_ID,
  GATEWAY_HEADER_WORKSPACE_ID,
  successResponse,
} from "packages";

import * as services from "./service";

export const listAllWorkspaces = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const userId = req.headers[GATEWAY_HEADER_USER_ID] as string;

    const result = await services.listAllWorkspaces({ res, userId });

    return successResponse(res, result);
  },
);

export const createWorkspace = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const userId = req.headers[GATEWAY_HEADER_USER_ID] as string;
    const { name, description } = req.body;

    const result = await services.createWorkspace({
      res,
      userId,
      name,
      description,
    });

    return successResponse(res, result);
  },
);

export const getWorkspace = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const nanoId = req.headers[GATEWAY_HEADER_WORKSPACE_ID] as string;

    const result = await services.getWorkspace({ res, nanoId });

    return successResponse(res, result);
  },
);

export const verifyUserWorkspace = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const userId = req.headers[GATEWAY_HEADER_USER_ID] as string;

    const { workspaceNanoId } = req.body ?? {};

    if (!workspaceNanoId) {
      return errorResponse(res, "Workspace id not found");
    }

    const response = await services.verifyUserWorkspace({
      userId,
      workspaceNanoId,
    });

    return successResponse(res, response);
  },
);
