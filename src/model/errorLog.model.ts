import { Schema, model } from "mongoose";
import { ErrorContext, ErrorSeverity } from "../error/error.types";

export interface IErrorLog {
  message: string;
  context: ErrorContext;
  severity: ErrorSeverity;
  source: string;
  metadata?: Record<string, unknown>;
  stack?: string;
  occurredAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
  {
    message: { type: String, required: true },
    context: { type: String, enum: Object.values(ErrorContext), required: true },
    severity: { type: String, enum: Object.values(ErrorSeverity), required: true },
    source: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    stack: { type: String },
    occurredAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

ErrorLogSchema.index({ context: 1, severity: 1, occurredAt: -1 });

export const ErrorLog = model<IErrorLog>("ErrorLog", ErrorLogSchema);
