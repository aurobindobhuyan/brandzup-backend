import { Request, Response, NextFunction } from "express";
import { OperationalError } from "./error";

export function GlobalErrorHanlder(
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode =
    Number.isInteger(error?.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  if (error instanceof OperationalError) {
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(statusCode).json({
    statusCode,
    name: error?.name ?? "Error",
    message: error?.message ?? "Server error",
    stackTrace: process.env.ENVIRONMENT === "Development" ? error?.stack : null,
  });
}
