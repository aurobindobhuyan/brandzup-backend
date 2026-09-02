import { Response } from "express";

export const successResponse = (
  res: Response,
  data: any,
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const errorResponse = (
  res: Response,
  data: any,
  statusCode = 400,
) => {
  return res.status(statusCode).json({
    success: false,
    data,
  });
};
