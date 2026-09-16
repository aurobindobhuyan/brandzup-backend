import type { NextFunction, Request, Response } from "express";
import { OperationalError } from "../errors/error";
import { GATEWAY_HEADER_WORKSPACE_ID } from "../constant";

/**
 * Blocks requests that don't carry a workspace id header.
 */
export function requireWorkspaceId(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const workspaceId = req.headers[GATEWAY_HEADER_WORKSPACE_ID];

  if (typeof workspaceId !== "string" || !workspaceId) {
    return next(new OperationalError(403, "Select a workspace first"));
  }

  return next();
}
