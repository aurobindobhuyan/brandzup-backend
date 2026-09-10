import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Response } from "express";
import Redis from "ioredis";
import { IPermission, logger } from "packages";

const client = new Redis(process.env.API_GATEWAY_REDIS_URL!);

client.on("ready", () => {
  logger.info("Redis is ready to accept");
});

client.on("error", () => {
  logger.error("Error connecting to Redis");
});

const sessionTtl = () => Number(process.env.SESSION_TTL ?? 60 * 60);
const handoffTtl = () => Number(process.env.HANDOFF_TOKEN_TTL ?? 30);

/* -------------------------------------------------------------------------- */
/*  Keys                                                                      */
/*                                                                            */
/*  deviceId:{deviceId}              parent auth session (hash)               */
/*  workspaceSession:{sessionId}     current workspace context (hash)         */
/*  auth-handoff:{sha256(token)}     one-time handoff (string, short TTL)     */
/* -------------------------------------------------------------------------- */

const userSessionKey = (deviceId: string) => `deviceId:${deviceId}`;
const workspaceSessionKey = (sessionId: string) =>
  `workspaceSession:${sessionId}`;
const handoffKey = (token: string) =>
  `auth-handoff:${createHash("sha256").update(token).digest("hex")}`;

/* -------------------------------------------------------------------------- */
/*  Parent device session                                                     */
/* -------------------------------------------------------------------------- */

export interface UserSession {
  userId: string;
  workspaceId?: string;
  permission?: IPermission;
  // Points at the single workspace session this device currently holds.
  workspaceSessionId?: string;
}

export async function getUserSession(
  deviceId: string,
): Promise<UserSession | null> {
  const raw = await client.hgetall(userSessionKey(deviceId));

  if (!raw.userId) {
    return null;
  }

  const session: UserSession = { userId: raw.userId };

  if (raw.workspaceId) session.workspaceId = raw.workspaceId;
  if (raw.workspaceSessionId) session.workspaceSessionId = raw.workspaceSessionId;
  if (raw.permission) session.permission = JSON.parse(raw.permission);

  return session;
}

export async function storeUserSession({
  deviceId,
  metaData,
  ttl = sessionTtl(),
}: {
  deviceId: string;
  metaData: Pick<UserSession, "userId">;
  ttl?: number;
}) {
  const key = userSessionKey(deviceId);

  await client
    .multi()
    .hset(key, { userId: metaData.userId })
    .expire(key, ttl)
    .exec();
}

/**
 * Records the workspace the device selected and drops the workspace session
 * that belonged to the previous selection, so a stale workspace cookie can no
 * longer resolve. The new workspace session is only created once the
 * workspace origin consumes its handoff token.
 */
export async function attachWorkspaceToSession({
  deviceId,
  workspaceId,
  permission,
}: {
  deviceId: string;
  workspaceId: string;
  permission: IPermission;
}) {
  const key = userSessionKey(deviceId);
  const current = await getUserSession(deviceId);

  const tx = client
    .multi()
    .hset(key, { workspaceId, permission: JSON.stringify(permission) })
    .hdel(key, "workspaceSessionId");

  if (current?.workspaceSessionId) {
    tx.del(workspaceSessionKey(current.workspaceSessionId));
  }

  await tx.exec();
}

/** Deletes the parent session and the workspace session it owns. */
export async function removeUserSession(deviceId: string) {
  const current = await getUserSession(deviceId);

  const tx = client.multi().del(userSessionKey(deviceId));

  if (current?.workspaceSessionId) {
    tx.del(workspaceSessionKey(current.workspaceSessionId));
  }

  await tx.exec();
}

/* -------------------------------------------------------------------------- */
/*  Workspace session                                                         */
/*                                                                            */
/*  One per device. Its id (not the deviceId) is what the workspace origin    */
/*  holds in its cookie, so a workspace domain never learns the parent id.    */
/* -------------------------------------------------------------------------- */

export interface WorkspaceSession {
  deviceId: string;
  workspaceId: string;
}

export async function getWorkspaceSession(
  sessionId: string,
): Promise<WorkspaceSession | null> {
  const raw = await client.hgetall(workspaceSessionKey(sessionId));

  if (!raw.deviceId || !raw.workspaceId) {
    return null;
  }

  return { deviceId: raw.deviceId, workspaceId: raw.workspaceId };
}

/**
 * Replaces the workspace session owned by the device and returns the new id.
 * The new session inherits the remaining TTL of the parent, so it can never
 * outlive it.
 */
export async function createWorkspaceSession({
  deviceId,
  workspaceId,
}: WorkspaceSession): Promise<string> {
  const parentKey = userSessionKey(deviceId);
  const [current, parentTtlMs] = await Promise.all([
    getUserSession(deviceId),
    client.pttl(parentKey),
  ]);

  if (!current || parentTtlMs <= 0) {
    throw new Error("Parent session is gone");
  }

  const sessionId = randomUUID();
  const key = workspaceSessionKey(sessionId);

  const tx = client
    .multi()
    .hset(key, { deviceId, workspaceId })
    .pexpire(key, parentTtlMs)
    .hset(parentKey, { workspaceSessionId: sessionId });

  if (current.workspaceSessionId) {
    tx.del(workspaceSessionKey(current.workspaceSessionId));
  }

  await tx.exec();

  return sessionId;
}

export async function removeWorkspaceSession(sessionId: string) {
  const session = await getWorkspaceSession(sessionId);

  const tx = client.multi().del(workspaceSessionKey(sessionId));

  if (session) {
    tx.hdel(userSessionKey(session.deviceId), "workspaceSessionId");
  }

  await tx.exec();
}

/* -------------------------------------------------------------------------- */
/*  Handoff token                                                             */
/*                                                                            */
/*  Cryptographically random, short-lived, single-use, stored hashed.         */
/*  The raw token goes to the client exactly once and is never persisted.     */
/* -------------------------------------------------------------------------- */

export interface HandoffPayload {
  deviceId: string;
  workspaceId: string;
}

export async function createHandoffToken(
  payload: HandoffPayload,
  ttl = handoffTtl(),
): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  await client.set(handoffKey(token), JSON.stringify(payload), "EX", ttl, "NX");

  return token;
}

/** Atomically reads and deletes the token, so it can only ever succeed once. */
export async function consumeHandoffToken(
  token: string,
): Promise<HandoffPayload | null> {
  const raw = await client.getdel(handoffKey(token));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as HandoffPayload;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Cookies                                                                   */
/* -------------------------------------------------------------------------- */

export const SESSION_COOKIE_NAME = "deviceId";
export const WORKSPACE_COOKIE_NAME = "workspaceSessionId";

const cookieOptions = () => {
  const isProduction = process.env.ENVIRONMENT?.toLowerCase() === "production";

  return {
    httpOnly: true,
    path: "/",
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
  };
};

export const setSessionCookie = (
  res: Response,
  deviceId: string,
  ttl = sessionTtl(),
) => {
  res.cookie(SESSION_COOKIE_NAME, deviceId, {
    ...cookieOptions(),
    maxAge: ttl * 1000,
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
};

export const setWorkspaceCookie = (
  res: Response,
  sessionId: string,
  ttl = sessionTtl(),
) => {
  res.cookie(WORKSPACE_COOKIE_NAME, sessionId, {
    ...cookieOptions(),
    maxAge: ttl * 1000,
  });
};

export const clearWorkspaceCookie = (res: Response) => {
  res.clearCookie(WORKSPACE_COOKIE_NAME, cookieOptions());
};
