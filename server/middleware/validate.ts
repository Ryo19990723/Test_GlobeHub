import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export interface ValidatedRequest extends Request {
  validated?: {
    body?: any;
    query?: any;
    params?: any;
  };
}

export function validateBody(schema: ZodSchema) {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.validated = { ...req.validated, body: validated };
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "入力内容に誤りがあります",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.validated = { ...req.validated, query: validated };
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "クエリパラメータに誤りがあります",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.validated = { ...req.validated, params: validated };
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "パラメータに誤りがあります",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
