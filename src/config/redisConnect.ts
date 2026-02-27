import Redis from 'ioredis';
import { redisLogger } from '../utils/loggers';
export const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
});
redis.on("connect", () => {
    redisLogger.info("Connected to Redis successfully.");
})
redis.on("error", (error) => {
    redisLogger.error("Error connecting to Redis", error);
}
);