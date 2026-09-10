import { Request, Response } from "express";
import { asyncErrorHandler, GATEWAY_HEADER_USER_ID, OperationalError, successResponse } from "packages";

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
