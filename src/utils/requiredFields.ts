import { Request, Response, NextFunction } from "express";
import * as loggers from "./loggers";

export const requiredFields =
  (fields: string[]) =>
    (req: Request, res: Response, next: NextFunction) => {
      const missingFields = fields.filter(
        (field) => req.body?.[field] === undefined
      );
      if (missingFields.length > 0) {
        loggers.apiLogger.warn("Missing required fields", {
          missingFields,
          body: req.body,
        });
        return res.status(400).json({
          message: "Missing required fields",
          missingFields,
        });
      }
      next();
    };
