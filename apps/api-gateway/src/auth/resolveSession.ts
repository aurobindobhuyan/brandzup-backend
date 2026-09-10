import { Request, Response } from "express";
import { IPermission } from "packages";

import {
  clearWorkspaceCookie,
  getUserSession,
  getWorkspaceSession,
  removeWorkspaceSession,
  SESSION_COOKIE_NAME,
  WORKSPACE_COOKIE_NAME,
} from "@src/utils/redis";

export interface ResolvedSession {
  deviceId: string;
  userId: string;
  workspaceId: string | null;
  permission: IPermission | null;
  /** Which cookie authenticated this request. */
  via: "workspace" | "device";
}

/**
 * Resolves the caller to the parent device session, which stays the single
 * source of truth for authentication.
 *
 * A workspace origin only holds the workspace cookie, so that is tried first:
 *
 *   workspace cookie -> workspaceSession:{id} -> deviceId:{deviceId}
 *
 * The root origin holds the device cookie and is resolved directly. A
 * workspace session whose parent is gone, or whose parent has since moved to
 * another workspace, is dead: it is removed and its cookie cleared.
 */
export async function resolveSession(
  req: Request,
  res: Response,
): Promise<ResolvedSession | null> {
  const workspaceSessionId = req.cookies?.[WORKSPACE_COOKIE_NAME];

  if (typeof workspaceSessionId === "string" && workspaceSessionId) {
    const workspaceSession = await getWorkspaceSession(workspaceSessionId);
    const parent = workspaceSession
      ? await getUserSession(workspaceSession.deviceId)
      : null;

    if (
      workspaceSession &&
      parent &&
      parent.workspaceId === workspaceSession.workspaceId
    ) {
      return {
        deviceId: workspaceSession.deviceId,
        userId: parent.userId,
        workspaceId: workspaceSession.workspaceId,
        permission: parent.permission ?? null,
        via: "workspace",
      };
    }

    if (workspaceSession) {
      await removeWorkspaceSession(workspaceSessionId);
    }

    clearWorkspaceCookie(res);
  }

  const deviceId = req.cookies?.[SESSION_COOKIE_NAME];

  if (typeof deviceId !== "string" || !deviceId) {
    return null;
  }

  const parent = await getUserSession(deviceId);

  if (!parent) {
    return null;
  }

  return {
    deviceId,
    userId: parent.userId,
    workspaceId: parent.workspaceId ?? null,
    permission: parent.permission ?? null,
    via: "device",
  };
}
