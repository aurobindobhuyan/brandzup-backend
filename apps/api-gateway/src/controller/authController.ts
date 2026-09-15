import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import {
  asyncErrorHandler,
  errorResponse,
  GATEWAY_HEADER_USER_ID,
  GATEWAY_TOKEN_HEADER,
  IPermission,
  OperationalError,
  successResponse,
} from "packages";

import {
  clearSessionCookie,
  clearWorkspaceCookie,
  consumeHandoffToken,
  createHandoffToken,
  getDeviceIdFromCookies,
  getUserSession,
  removeUserSession,
  removeWorkspaceSession,
  resolveSession,
  setSessionCookie,
  setWorkspaceCookie,
  storeUserSession,
  storeWorkspaceSession,
  switchWorkspaceSession,
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

  const userId = payload.data;

  const deviceId = randomUUID();

  await storeUserSession({ deviceId, metaData: userId });

  setSessionCookie(res, deviceId);

  return successResponse(res, userId);
});

export const me = asyncErrorHandler(async (req: Request, res: Response) => {
  const resolved = await resolveSession(req.cookies);

  if (resolved === null) {
    return errorResponse(res, "Session Expired", 401);
  }

  const { session } = resolved;
  const { userId } = session;
  let workspaceId = null;
  let permission = null;

  if (session["x-workspace-nano-id"]) {
    workspaceId = session["x-workspace-nano-id"];
    permission = session["x-workspace-permission"];
  }

  return successResponse(res, {
    userId,
    workspaceId,
    permission,
  });
});

export const logout = asyncErrorHandler(async (req: Request, res: Response) => {
  const deviceId = getDeviceIdFromCookies(req.cookies);

  if (deviceId) {
    await removeWorkspaceSession(deviceId);
    await removeUserSession(deviceId);
  }

  clearSessionCookie(res);
  clearWorkspaceCookie(res);

  return successResponse(res, { message: "Logged out successfully" });
});

/**
 * get the userId from redis.
 * call /verify-workspace
 * update the user session with selected workspaceId.
 * create a short-lived one time token expires at 30s
 * auth-handoff:{hash(token)} { parentDeviceId: abc }
 * returns the token to client. 
 */
export const selectWorkspace = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const deviceId = req.cookies?.deviceId;
    const session = await getUserSession(deviceId);

    if (session === null) {
      return errorResponse(res, "Session Expired", 401);
    }

    const { workspaceId } = req.body ?? {};

    // Verify if the user belongs to the workspace
    const upstream = await fetch(
      `${process.env.ORG_SERVICE_URL}/workspace/verify-workspace`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [GATEWAY_TOKEN_HEADER]: createGatewayToken(),
          [GATEWAY_HEADER_USER_ID]: session.userId,
        },
        body: JSON.stringify({ workspaceNanoId: workspaceId }),
      },
    );

    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      throw new OperationalError(
        upstream.status,
        payload?.message ?? "You don't belong to this workspace",
      );
    }

    const permission: IPermission = payload.data;

    // Update the parent device session with the selected workspace.
    await switchWorkspaceSession(
      deviceId,
      permission.workspaceNanoId,
      permission,
    );

    // One-time token the workspace domain will exchange for its own session.
    const token = await createHandoffToken(
      deviceId,
      permission.workspaceNanoId,
    );

    return successResponse(res, {
      token,
      workspaceId: permission.workspaceNanoId,
    });
  },
);

/**
 * Runs on the workspace domain (company.<workspaceId>.localhost).
 * Atomically consumes the one-time handoff token, checks the parent session
 * is still alive, then creates/replaces workspaceSession:{parentDeviceId}
 * and sets the workspace cookie for this domain.
 */
export const consumeToken = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const { token } = req.body ?? {};

    if (!token) {
      return errorResponse(res, "Token is required", 400);
    }

    const handoff = await consumeHandoffToken(token);

    if (handoff === null) {
      return errorResponse(res, "Invalid or expired token", 401);
    }

    const { parentDeviceId, workspaceId } = handoff;
    const session = await getUserSession(parentDeviceId);

    if (session === null) {
      return errorResponse(res, "Session Expired", 401);
    }

    await storeWorkspaceSession(parentDeviceId, workspaceId);

    setWorkspaceCookie(res, parentDeviceId);

    return successResponse(res, { workspaceId });
  },
);
