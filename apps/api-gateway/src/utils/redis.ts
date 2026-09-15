import { createHash, randomBytes } from "node:crypto";
import { Response } from "express";
import Redis from "ioredis";
import {
  GATEWAY_HEADER_PERMISSION,
  GATEWAY_HEADER_WORKSPACE_ID,
  IPermission,
  logger,
} from "packages";

const client = new Redis(process.env.API_GATEWAY_REDIS_URL!);

client.on("ready", () => {
  logger.info("Redis is ready to accept");
});

client.on("error", () => {
  logger.error("Error connecting to Redis");
});

const sessionTtl = () => Number(process.env.SESSION_TTL ?? 60 * 60);

export interface UserSession {
  userId: string;
  [GATEWAY_HEADER_WORKSPACE_ID]?: string;
  [GATEWAY_HEADER_PERMISSION]?: IPermission;
}

const SESSION_KEY_PREFIX = "deviceId:- ";
export const SESSION_COOKIE_NAME = "deviceId";
const getUserSessionKey = (deviceId: string) =>
  `${SESSION_KEY_PREFIX}${deviceId}`;

const serializeSessionFields = (
  fields: Partial<UserSession>,
): Record<string, string> => {
  const result: Record<string, string> = {};

  if (fields.userId) {
    result.userId = fields.userId;
  }

  if (fields[GATEWAY_HEADER_WORKSPACE_ID]) {
    result[GATEWAY_HEADER_WORKSPACE_ID] = fields[GATEWAY_HEADER_WORKSPACE_ID]!;
  }

  if (fields[GATEWAY_HEADER_PERMISSION]) {
    result[GATEWAY_HEADER_PERMISSION] = JSON.stringify(
      fields[GATEWAY_HEADER_PERMISSION],
    );
  }

  return result;
};

export async function getUserSession(
  deviceId: string,
): Promise<UserSession | null> {
  const raw = await client.hgetall(getUserSessionKey(deviceId));

  if (!raw.userId) {
    return null;
  }

  const session: UserSession = { userId: raw.userId };

  if (raw[GATEWAY_HEADER_WORKSPACE_ID]) {
    session[GATEWAY_HEADER_WORKSPACE_ID] = raw[GATEWAY_HEADER_WORKSPACE_ID];
  }

  if (raw[GATEWAY_HEADER_PERMISSION]) {
    session[GATEWAY_HEADER_PERMISSION] = JSON.parse(
      raw[GATEWAY_HEADER_PERMISSION],
    ) as IPermission;
  }

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
  const key = getUserSessionKey(deviceId);

  await client
    .pipeline()
    .hset(key, serializeSessionFields(metaData))
    .expire(key, ttl)
    .exec();
}

export async function switchWorkspaceSession(
  deviceId: string,
  workspaceId: string,
  permission: IPermission,
) {
  const key = getUserSessionKey(deviceId);

  await client.hset(key, {
    [GATEWAY_HEADER_WORKSPACE_ID]: workspaceId,
    [GATEWAY_HEADER_PERMISSION]: JSON.stringify(permission),
  });
}

export async function removeUserSession(deviceId: string) {
  await client.del(getUserSessionKey(deviceId));
}

const HANDOFF_KEY_PREFIX = "auth-handoff:";
const HANDOFF_TTL = 30;
const getHandoffKey = (token: string) =>
  `${HANDOFF_KEY_PREFIX}${createHash("sha256").update(token).digest("hex")}`;

/**
 * Creates a short-lived, one-time handoff token and stores its hash in redis.
 * Returns the raw token to hand to the client.
 */
export async function createHandoffToken(
  parentDeviceId: string,
  workspaceId: string,
) {
  const token = randomBytes(32).toString("hex");
  const key = getHandoffKey(token);

  await client
    .pipeline()
    .hset(key, { parentDeviceId, workspaceId })
    .expire(key, HANDOFF_TTL)
    .exec();

  return token;
}

/**
 * Atomically reads and deletes the handoff token. Returns null if it is
 * missing, expired, or already used.
 */
export async function consumeHandoffToken(token: string) {
  const key = getHandoffKey(token);

  const results = await client.multi().hgetall(key).del(key).exec();
  const data = results?.[0]?.[1] as Record<string, string> | undefined;

  if (!data?.parentDeviceId || !data.workspaceId) {
    return null;
  }

  return { parentDeviceId: data.parentDeviceId, workspaceId: data.workspaceId };
}

// Workspace session: one per device, keyed by the parent deviceId.
// No TTL on purpose: it is only valid while the parent session exists.
const WORKSPACE_SESSION_KEY_PREFIX = "workspaceSession:";
export const WORKSPACE_COOKIE_NAME = "workspaceSession";
const getWorkspaceSessionKey = (deviceId: string) =>
  `${WORKSPACE_SESSION_KEY_PREFIX}${deviceId}`;

export async function storeWorkspaceSession(
  deviceId: string,
  workspaceId: string,
) {
  await client.set(getWorkspaceSessionKey(deviceId), workspaceId);
}

export async function getWorkspaceSession(deviceId: string) {
  return client.get(getWorkspaceSessionKey(deviceId));
}

export async function removeWorkspaceSession(deviceId: string) {
  await client.del(getWorkspaceSessionKey(deviceId));
}

/** Root domain carries the parent cookie; workspace domains carry the workspace cookie. */
export const getDeviceIdFromCookies = (cookies: Record<string, string> = {}) =>
  cookies[SESSION_COOKIE_NAME] ?? cookies[WORKSPACE_COOKIE_NAME];

/**
 * Resolves the authenticated session from whichever cookie the domain has.
 * A workspace cookie is only honoured while workspaceSession:{deviceId}
 * still points at the parent's selected workspace.
 */
export async function resolveSession(cookies: Record<string, string> = {}) {
  const deviceId = getDeviceIdFromCookies(cookies);

  if (!deviceId) return null;

  const session = await getUserSession(deviceId);

  if (!session) return null;

  if (!cookies[SESSION_COOKIE_NAME]) {
    const workspaceId = await getWorkspaceSession(deviceId);

    if (!workspaceId || workspaceId !== session[GATEWAY_HEADER_WORKSPACE_ID]) {
      return null;
    }
  }

  return { deviceId, session };
}

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

export const setWorkspaceCookie = (res: Response, deviceId: string) => {
  res.cookie(WORKSPACE_COOKIE_NAME, deviceId, cookieOptions());
};

export const clearWorkspaceCookie = (res: Response) => {
  res.clearCookie(WORKSPACE_COOKIE_NAME, cookieOptions());
};
