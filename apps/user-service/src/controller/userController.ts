import { Request, Response } from "express";
import { asyncErrorHandler, OperationalError, successResponse } from "packages";

import * as services from "./services";

export const login = asyncErrorHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const data = await services.login({ email, password });

  return successResponse(res, data);
});

export const register = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const { name, email, password, profilePic } = req.body;

    const data = await services.register({
      name,
      email,
      password,
      profilePic,
    });

    return successResponse(res, data);
  },
);

export const me = asyncErrorHandler(async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;

  if (!userId) {
    throw new OperationalError(401, "Not authenticated");
  }

  const data = await services.getUserById(userId);

  return successResponse(res, data);
});
