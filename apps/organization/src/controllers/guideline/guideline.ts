import { Response, Request } from "express";
import {
  asyncErrorHandler,
  getDataFromHeaders,
  successResponse,
} from "packages";

import * as services from "./services";

export const getAllGuidelines = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const brandId = req.params.brandId as string;

    const result = await services.getAllGuidelines({ brandNanoId: brandId });

    return successResponse(res, result);
  },
);

export const getOneGuideline = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const guidelineId = req.params.guidelineId as string;

    const result = await services.getOneGuideline({ nanoId: guidelineId });

    return successResponse(res, result);
  },
);

export const createGuideline = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const brandId = req.params.brandId as string;
    const { userId, workspaceId } = getDataFromHeaders(req);

    const result = await services.createGuideline({
      createdBy: userId,
      brandNanoId: brandId,
      workspaceNanoId: workspaceId,
      ...req.body,
    });

    return successResponse(res, result);
  },
);
