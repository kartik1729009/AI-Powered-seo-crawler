import { ErrorContext, ErrorSeverity, ErrorSource } from "./error.types";
export abstract class BaseError extends Error {
  public readonly message: string;
  public readonly context: ErrorContext;
  public readonly severity: ErrorSeverity;
  public readonly source: ErrorSource;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;
  public readonly occurredAt: Date;
  protected constructor(params: {
    message: string;                 
    context: ErrorContext;         
    severity: ErrorSeverity;        
    source: ErrorSource;             
    isOperational: boolean;
    metadata?: Record<string, unknown>;
  }) {
    super(params.message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.message = params.message;
    this.context = params.context;
    this.severity = params.severity;
    this.source = params.source;
    this.isOperational = params.isOperational;
    this.metadata = params.metadata;
    this.occurredAt = new Date();
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,       
      context: this.context,
      severity: this.severity,
      source: this.source,
      isOperational: this.isOperational,
      metadata: this.metadata,
      occurredAt: this.occurredAt,
      stack: this.stack
    };
  }
}
