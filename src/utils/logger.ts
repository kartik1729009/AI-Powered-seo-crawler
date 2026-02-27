export type LogContext =
  | "APP"
  | "DATABASE"
  | "REDIS"
  | "AUTH"
  | "API"
  | "WORKER"
  | "SCHEDULER"
  | "CACHE"
  | "QUEUE"
  | "EMAIL"
  | "PAYMENTS"                                                    
  | "NOTIFICATIONS"
  | "HTTP"
  | "HELPER";
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";
type LogMeta = Record<string, unknown>;
class Logger {
  private context: LogContext;
  constructor(context: LogContext) {
    this.context = context;
  }
  private format(
    level: LogLevel,
    message: string,
    meta?: LogMeta
  ): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(meta && { meta })
    });
  }
  info(message: string, meta?: LogMeta): void {
    console.log(this.format("INFO", message, meta));
  }
  warn(message: string, meta?: LogMeta): void {
    console.warn(this.format("WARN", message, meta));
  }
  error(
    message: string,
    error?: unknown,
    meta?: LogMeta
  ): void {
    console.error(
      this.format("ERROR", message, {
        error: error instanceof Error ? error.message : error,
        ...meta
      })
    );
  }
  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.format("DEBUG", message, meta));
    }
  }
}
export const createLogger = (context: LogContext): Logger => {
  return new Logger(context);
};


