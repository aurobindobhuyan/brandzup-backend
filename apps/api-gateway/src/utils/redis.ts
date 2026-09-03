import { Response } from "express";
import Redis from "ioredis";
import { logger } from "packages";

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
}

const getUserSessionKey = (deviceId: string) => `session:${deviceId}`;

export async function getUserSession(
  deviceId: string,
): Promise<UserSession | null> {
  const raw = await client.get(getUserSessionKey(deviceId));

  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    logger.error(`Malformed session payload for deviceId ${deviceId}`);
    return null;
  }
}

export async function storeUserSession({
  deviceId,
  metaData,
  ttl = sessionTtl(),
}: {
  deviceId: string;
  metaData: UserSession;
  ttl?: number;
}) {
  await client.setex(
    getUserSessionKey(deviceId),
    ttl,
    JSON.stringify(metaData),
  );
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
  res.cookie("deviceId", deviceId, { ...cookieOptions(), maxAge: ttl * 1000 });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie("deviceId", cookieOptions());
};
