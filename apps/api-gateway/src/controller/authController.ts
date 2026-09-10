import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import {
  asyncErrorHandler,
  errorResponse,
  GATEWAY_TOKEN_HEADER,
  OperationalError,
  successResponse,
} from "packages";

import {
  attachWorkspaceToSession,
  clearSessionCookie,
  clearWorkspaceCookie,
  consumeHandoffToken,
  createHandoffToken,
  createWorkspaceSession,
  getUserSession,
  removeUserSession,
  setSessionCookie,
  setWorkspaceCookie,
  storeUserSession,
} from "@src/utils/redis";
import { createGatewayToken } from "@src/utils/gatewayToken";
import { getWorkspacePermission } from "@src/utils/orgClient";
import { resolveSession } from "@src/auth/resolveSession";
import { isValidWorkspaceId, workspaceIdFromOrigin } from "@src/auth/origins";

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

export const me = asyncErrorHandler(async (req: Request, res: Response) => {
  const session = await resolveSession(req, res);

  if (session === null) {
    return errorResponse(res, "Session Expired", 401);
  }

  const { userId, workspaceId, permission } = session;

  return successResponse(res, { userId, workspaceId, permission });
});

/**
 * Step 1 of the handoff. Verifies access, records the choice on the parent
 * session and hands back a one-time token. The client then navigates to the
 * workspace origin, which trades the token for its own workspace cookie.
 */
export const selectWorkspace = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const session = await resolveSession(req, res);

    if (session === null) {
      throw new OperationalError(401, "Not authenticated");
    }

    const { workspaceId } = req.body ?? {};

    if (!isValidWorkspaceId(workspaceId)) {
      throw new OperationalError(400, "A valid workspaceId is required");
    }

    const permission = await getWorkspacePermission({
      userId: session.userId,
      workspaceId,
    });

    await attachWorkspaceToSession({
      deviceId: session.deviceId,
      workspaceId,
      permission,
    });

    const token = await createHandoffToken({
      deviceId: session.deviceId,
      workspaceId,
    });

    return successResponse(res, { token, workspaceId });
  },
);

/**
 * Step 2 of the handoff, called from the workspace origin. The token is
 * consumed atomically, so a replayed or expired one fails here. The origin
 * must be the workspace the token was minted for, and the parent must still
 * be pointed at that workspace, otherwise a token from an older selection
 * could re-open a workspace the user has already left.
 */
export const consumeHandoff = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const { token } = req.body ?? {};

    if (typeof token !== "string" || !token) {
      throw new OperationalError(400, "A token is required");
    }

    const origin = req.get("origin");
    const originWorkspaceId = origin ? workspaceIdFromOrigin(origin) : null;

    if (!originWorkspaceId) {
      throw new OperationalError(403, "Untrusted origin");
    }

    const handoff = await consumeHandoffToken(token);

    if (!handoff || handoff.workspaceId !== originWorkspaceId) {
      throw new OperationalError(401, "This link has expired or was already used");
    }

    const parent = await getUserSession(handoff.deviceId);

    if (!parent || parent.workspaceId !== handoff.workspaceId) {
      throw new OperationalError(401, "Session expired");
    }

    const workspaceSessionId = await createWorkspaceSession({
      deviceId: handoff.deviceId,
      workspaceId: handoff.workspaceId,
    });

    setWorkspaceCookie(res, workspaceSessionId);

    return successResponse(res, { workspaceId: handoff.workspaceId });
  },
);

export const logout = asyncErrorHandler(async (req: Request, res: Response) => {
  // Works from either origin: the workspace cookie resolves back to the
  // parent, and removing the parent also removes its workspace session.
  const session = await resolveSession(req, res);

  if (session) {
    await removeUserSession(session.deviceId);
  }

  clearSessionCookie(res);
  clearWorkspaceCookie(res);

  return successResponse(res, { message: "Logged out successfully" });
});
