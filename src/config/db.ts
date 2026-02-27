import mongoose from "mongoose";
import { createLogger } from "../utils/logger";
import { env } from "../config/env";

const dbLogger = createLogger("DATABASE");

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    dbLogger.info("MongoDB connected successfully", {
      host: env.MONGO_HOST,
      port: env.MONGO_PORT,
      db: env.MONGO_DB_NAME,
    });
  } catch (err) {
    dbLogger.error("Failed to connect to MongoDB", {
      error: err,
      host: env.MONGO_HOST,
      port: env.MONGO_PORT,
    });
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    dbLogger.warn("MongoDB disconnected");
  });

  mongoose.connection.on("error", (err) => {
    dbLogger.error("MongoDB connection error", { error: err });
  });
};
