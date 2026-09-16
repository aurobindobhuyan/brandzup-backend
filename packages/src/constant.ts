import { Request } from "express";
import { OperationalError } from "./errors/error";
import type { IPermission } from "./utility/permission";

export const GATEWAY_HEADER_USER_ID = "x-user-id";
export const GATEWAY_TOKEN_HEADER = "x-gateway-token";
export const GATEWAY_HEADER_WORKSPACE_ID = "x-workspace-nano-id";
export const GATEWAY_HEADER_PERMISSION = "x-workspace-permission";

export interface IHeaderData {
  userId: string;
  workspaceId: string;
  userPermission: IPermission;
}

const readHeader = (req: Request, name: string): string | null => {
  const value = req.headers[name];
  return typeof value === "string" && value ? value : null;
};

/**
 * Reads the gateway-injected identity headers.
 * Throws when any of them is missing or malformed, so callers always get
 * a fully populated, typed object.
 */
export function getDataFromHeaders(req: Request): IHeaderData {
  const userId = readHeader(req, GATEWAY_HEADER_USER_ID);
  const workspaceId = readHeader(req, GATEWAY_HEADER_WORKSPACE_ID);
  const rawPermission = readHeader(req, GATEWAY_HEADER_PERMISSION);

  if (!userId || !workspaceId || !rawPermission) {
    throw new OperationalError(403, "Use this inside requireWorkspace middleware");
  }

  let userPermission: IPermission;

  try {
    userPermission = JSON.parse(rawPermission) as IPermission;
  } catch {
    throw new OperationalError(403, "Workspace access denied");
  }

  return { userId, workspaceId, userPermission };
}
