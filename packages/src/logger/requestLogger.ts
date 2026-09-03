import { NextFunction, Request, Response } from "express";
import { logger } from "./logger";
import { GATEWAY_HEADER_USER_ID } from "../constant";

function levelForStatus(status: number): "critical" | "error" | "warn" | "info" {
  if (status >= 500) return "critical";
  if (status >= 400) return "error";
  if (status >= 300) return "warn";
  return "info";
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const responseTimeMs = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;

    const userId =
      (req as any).user?.id ?? (req as any).userId ?? req.headers[GATEWAY_HEADER_USER_ID] ?? "unknown";

    const meta = {
      method: req.method,
      url: req.originalUrl,
      status,
      responseTime: `${responseTimeMs.toFixed(2)}ms`,
      userId,
      ip: req.ip,
    };

    logger.log(levelForStatus(status), JSON.stringify(meta, null, 2));
  });

  next();
}
