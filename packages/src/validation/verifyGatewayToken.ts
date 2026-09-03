import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { OperationalError } from "../errors/error";
import { GATEWAY_TOKEN_HEADER } from "../constant";

const GATEWAY_SECRET = process.env.GATEWAY_SECRET!;

function isValidGatewayToken(token: string): boolean {
  const [tokenId, receivedSignature] = token.split(".");

  if (!tokenId || !receivedSignature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", GATEWAY_SECRET)
    .update(tokenId)
    .digest("hex");

  const received = Buffer.from(receivedSignature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
}

export function verifyGatewayToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = req.headers[GATEWAY_TOKEN_HEADER];

  if (typeof token !== "string" || !isValidGatewayToken(token)) {
    return next(new OperationalError(404, "Brother Ewwww.......!!!!!!!"));
  }

  next();
}
