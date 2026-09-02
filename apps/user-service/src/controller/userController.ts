import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import { asyncErrorHandler, successResponse } from "packages";

import * as services from "./services";
import {
  removeUserSession,
  storeUserSession,
  UserToken,
} from "@src/utils/redis";

const setSession = async ({
  res,
  deviceId,
  metaData,
  ttl = 60 * 60, // default to 1hr
}: {
  res: Response;
  deviceId: string;
  metaData: UserToken;
  ttl?: number;
}) => {
  await storeUserSession({ deviceId, metaData, ttl });

  const isProduction = process.env.ENVIRONMENT === "production";

  res.cookie("deviceId", deviceId, {
    maxAge: ttl * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
};

export const login = asyncErrorHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const data = await services.login({ email, password });

  const metaData = { userId: data._id };

  const deviceId = randomUUID();

  await setSession({ res, deviceId, metaData });

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

export const logout = asyncErrorHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.cookies;

  if (deviceId) {
    await removeUserSession(deviceId);
  }

  res.clearCookie("deviceId");

  return successResponse(res, {
    message: "Logged out successfully",
  });
});
