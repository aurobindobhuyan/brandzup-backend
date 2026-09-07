import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import {
  asyncErrorHandler,
  GATEWAY_TOKEN_HEADER,
  OperationalError,
  successResponse,
} from "packages";

import {
  clearSessionCookie,
  removeUserSession,
  setSessionCookie,
  storeUserSession,
} from "@src/utils/redis";
import { createGatewayToken } from "@src/utils/gatewayToken";

export const login = asyncErrorHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  const upstream = await fetch(
    `${process.env.USER_SERVICE_URL}/internal/login`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [GATEWAY_TOKEN_HEADER]: createGatewayToken(),
      },
      body: JSON.stringify({ email, password }),
    },
  );

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    throw new OperationalError(
      upstream.status,
      payload?.message ?? "Invalid email or password",
    );
  }

  const user = payload.data;

  const deviceId = randomUUID();

  await storeUserSession({ deviceId, metaData: { userId: user._id } });

  setSessionCookie(res, deviceId);

  return successResponse(res, user);
});

export const logout = asyncErrorHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.cookies;

  if (deviceId) {
    await removeUserSession(deviceId);
  }

  clearSessionCookie(res);

  return successResponse(res, { message: "Logged out successfully" });
});
