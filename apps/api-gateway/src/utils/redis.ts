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
