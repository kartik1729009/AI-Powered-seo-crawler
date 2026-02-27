import { createLogger } from "./logger";

// App-level logs
export const appLogger = createLogger("APP");

// Core layers logs
export const apiLogger = createLogger("API");
export const httpLogger = createLogger("HTTP");
export const authLogger = createLogger("AUTH");

// Infra logs
export const dbLogger = createLogger("DATABASE");
export const cacheLogger = createLogger("CACHE");
export const queueLogger = createLogger("QUEUE");
export const redisLogger = createLogger("REDIS");
export const helperLogger = createLogger("HELPER")

// Background jobs logs
export const workerLogger = createLogger("WORKER");
export const schedulerLogger = createLogger("SCHEDULER");

// External services logs
export const emailLogger = createLogger("EMAIL");
export const paymentsLogger = createLogger("PAYMENTS");
export const notificationsLogger = createLogger("NOTIFICATIONS");

