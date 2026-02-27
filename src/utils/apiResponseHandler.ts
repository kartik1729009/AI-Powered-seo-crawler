import * as loggers from './loggers';
import { Response } from 'express';
import { BaseError } from '../error/baseError';

export const apiResponseHandler = (
  res: Response,
  data?: unknown,
  error?: unknown
) => {
  const timestamp = new Date().toISOString();
  if (error) {
    let statusCode = 500;
    let message = "Internal Server Error";
    let extra: Record<string, any> = {};

    // BaseError (your custom structured errors)
    if (error instanceof BaseError) {
      statusCode = error.isOperational ? 400 : 500;
      message = error.message;

      extra = {
        context: error.context,
        source: error.source,
        severity: error.severity,
        metadata: error.metadata ?? null,
        timestamp: error.occurredAt ?? timestamp
      };
    }

    else if ((error as any)?.name === "ValidationError") {
      statusCode = 400;
      message = "Validation Failed";
      extra = {
        errors: Object.values((error as any).errors).map(
          (err: any) => err.message
        )
      };
    }

    else if ((error as any)?.code === 11000) {
      statusCode = 409;
      message = "Duplicate field value";
      extra = {
        duplicateKey: (error as any).keyValue
      };
    }

    else if ((error as any)?.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token";
    }
    else if ((error as any)?.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token expired";
    }

    else if ((error as any)?.name === "ZodError") {
      statusCode = 400;
      message = "Validation Failed";
      extra = {
        errors: (error as any).errors
      };
    }

    else if (error instanceof Error) {
      message = error.message;
      extra = {
        stack: error.stack
      };
    }

    else {
      message = "Unexpected Error";
      extra = { error };
    }

    loggers.apiLogger.error("API Response Error", {
      message,
      statusCode,
      error: error instanceof Error ? error.stack : error,
      timestamp
    });

    return res.status(statusCode).json({
      status: "error",
      statusCode,
      message,
      ...extra,
      timestamp
    });
  }

  loggers.apiLogger.info("API Response Success");

  let formattedData = data;

  if (data && typeof data === 'object' && 'toObject' in data) {
    formattedData = (data as any).toObject();
  }

  if (formattedData && typeof formattedData === 'object' && '__v' in formattedData) {
    delete (formattedData as any).__v;
  }

  if (formattedData && typeof formattedData === 'object' && '_id' in formattedData) {
    (formattedData as any).id = (formattedData as any)._id;
    delete (formattedData as any)._id;
  }

  const statusCode =
    formattedData && typeof formattedData === 'object' && 'id' in formattedData
      ? 201
      : 200;

  return res.status(statusCode).json({
    status: "success",
    statusCode,
    message:
      statusCode === 201
        ? "Resource created successfully"
        : "Request successful",
    data: formattedData ?? null,
    timestamp
  });
};
