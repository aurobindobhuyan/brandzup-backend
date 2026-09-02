import Redis from "ioredis";
import { logger } from "packages";

const client = new Redis(process.env.USER_SERVICE_REDIS_URL!);

client.on("ready", () => {
  logger.info("Redis is ready to accept");
});

client.on("error", () => {
  logger.error("Error connecting to Redis");
});

export interface UserToken {
  userId: string;
}

const getUserSessionKey = (deviceId: string) => `deviceId:- ${deviceId}`;

export async function storeUserSession({
  deviceId,
  metaData,
  ttl,
}: {
  deviceId: string;
  metaData: UserToken;
  ttl: number;
}) {
  const key = getUserSessionKey(deviceId);

  await client.setex(key, ttl, JSON.stringify(metaData));
}

export async function removeUserSession(deviceId: string) {
  const key = getUserSessionKey(deviceId);

  await client.del(key);
}
