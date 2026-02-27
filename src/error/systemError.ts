import { BaseError } from "./baseError";
import { ErrorContext, ErrorSeverity, ErrorSource } from "./error.types";
import { ErrorLog } from "../model/errorLog.model";

export class SystemError extends BaseError {
  constructor(params: {
    message: string;
    context: ErrorContext;
    source: ErrorSource;          
    severity?: ErrorSeverity;
    metadata?: Record<string, unknown>;
    isOperational?: boolean;
  }) {
    super({
      message: params.message,
      context: params.context,
      source: params.source,     
      severity: params.severity ?? ErrorSeverity.HIGH,
      isOperational: params.isOperational ?? true,
      metadata: params.metadata
    });

    this.saveToDB().catch((err) => {
      console.error("Failed to persist SystemError:", err);
      console.error("Original error:", this.toJSON());
    });
  }
  private async saveToDB() {
    await ErrorLog.create({
      message: this.message,
      context: this.context,
      severity: this.severity,
      source: this.source,
      metadata: this.metadata,
      stack: this.stack,
      occurredAt: this.occurredAt
    });
  }
}
