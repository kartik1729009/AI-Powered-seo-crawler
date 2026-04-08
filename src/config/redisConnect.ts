// import Redis from 'ioredis';
// import { redisLogger } from '../utils/loggers';
// export const redis = new Redis({
//     host: process.env.REDIS_HOST,
//     port: Number(process.env.REDIS_PORT),
//     password: process.env.REDIS_PASSWORD,
//     maxRetriesPerRequest: null
// });
// redis.on("connect", () => {
//     redisLogger.info("Connected to Redis successfully.");
// })
// redis.on("reconnecting", ()=>{
//     redisLogger.info("Reconnecting Redis...")
// })
// redis.on("error", (error) => {
//     redisLogger.error("Error connecting to Redis", error);
// }
// // );
// import Redis from 'ioredis';
// import { redisLogger } from '../utils/loggers';

// export const redis = new Redis(process.env.REDIS_URL as string, {
//     maxRetriesPerRequest: null
// });

// redis.on("connect", () => {
//     redisLogger.info("Connected to Redis successfully.");
// });

// redis.on("reconnecting", () => {
//     redisLogger.info("Reconnecting Redis...");
// });

// redis.on("error", (error) => {
//     redisLogger.error("Error connecting to Redis", error);
// });
import Redis from "ioredis";
import { redisLogger } from "../utils/loggers";

// 🔥 IMPORTANT: Proper config for Upstash + BullMQ
export const redis = new Redis(process.env.REDIS_URL as string, {
    maxRetriesPerRequest: null,      // required for BullMQ
    enableReadyCheck: false,         // important for Upstash
    retryStrategy(times) {
        if (times > 5) {
            return null; // stop retrying after 5 attempts (prevents infinite loop)
        }
        return Math.min(times * 200, 2000);
    },
});

redis.on("connect", () => {
    redisLogger.info("Connected to Redis successfully.");
});

redis.on("ready", () => {
    redisLogger.info("Redis is ready to accept commands.");
});

redis.on("reconnecting", () => {
    redisLogger.info("Reconnecting Redis...");
});

redis.on("error", (error) => {
    redisLogger.error("Error connecting to Redis", error);
});

redis.on("end", () => {
    redisLogger.warn("Redis connection closed.");
});