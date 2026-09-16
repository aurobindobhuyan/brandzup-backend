import { Request, Response } from "express";
import {
  asyncErrorHandler,
  getDataFromHeaders,
  successResponse,
} from "packages";

import * as services from "./services";

export const listAllBrands = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const { workspaceId } = getDataFromHeaders(req);

    const brands = await services.listAllBrands({ res, workspaceId });

    return successResponse(res, brands);
  },
);

export const createBrand = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const { workspaceId, userId } = getDataFromHeaders(req);

    const result = await services.createBrand({
      res,
      createdBy: userId,
      workspaceNanoId: workspaceId,
      ...req.body,
    });

    return successResponse(res, result);
  },
);
