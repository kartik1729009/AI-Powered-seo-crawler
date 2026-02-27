export enum ErrorContext {
  APP = "APP",
  DATABASE = "DATABASE",
  AUTH = "AUTH",
  API = "API",
  WORKER = "WORKER",
  SCHEDULER = "SCHEDULER",
  CACHE = "CACHE",
  QUEUE = "QUEUE",
  EMAIL = "EMAIL",
  PAYMENTS = "PAYMENTS",
  NOTIFICATIONS = "NOTIFICATIONS",
  HTTP = "HTTP"
}
export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}
export type ErrorSource =
  | "API"
  | "WORKER"
  | "CRON"
  | "EVENT"
  | "FUNCTION"
  | "SYSTEM"
  | "CONTROLLER"
  | "HELPER";
