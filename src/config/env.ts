import dotenv from "dotenv";
dotenv.config();

const requiredEnvVariables = [
  "MONGO_URI",
  "MONGO_HOST",
  "MONGO_PORT",
  "MONGO_DB_NAME",
  "MONGO_USER",
  "MONGO_PASSWORD",
  "PORT"
];

requiredEnvVariables.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Environment variable ${varName} is not set.`);
  }
});

export const env = {
  PORT: Number(process.env.PORT),
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI as string,
  MONGO_HOST: process.env.MONGO_HOST as string,
  MONGO_PORT: Number(process.env.MONGO_PORT),
  MONGO_DB_NAME: process.env.MONGO_DB_NAME as string,
  MONGO_USER: process.env.MONGO_USER as string,
  MONGO_PASSWORD: process.env.MONGO_PASSWORD as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: Number(process.env.JWT_EXPIRES_IN)
};
