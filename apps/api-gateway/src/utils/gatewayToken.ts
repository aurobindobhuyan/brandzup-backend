import crypto from "node:crypto";

const GATEWAY_SECRET = process.env.GATEWAY_SECRET!;

export function createGatewayToken(): string {
  const tokenId = crypto.randomBytes(32).toString("hex");

  const signature = crypto
    .createHmac("sha256", GATEWAY_SECRET)
    .update(tokenId)
    .digest("hex");

  return `${tokenId}.${signature}`;
}
