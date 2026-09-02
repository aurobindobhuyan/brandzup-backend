import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const validate = schema.safeParse(req.body);

    if (!validate || validate.error) {
      const message = validate.error.issues
        .map((ele) => ele.message)
        .join(", ");

      next(message);
    }

    req.body = validate.data;
    next();
  };
};
