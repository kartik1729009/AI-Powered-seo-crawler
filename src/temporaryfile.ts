import dotenv from "dotenv";
dotenv.config();
import { Queue, Worker, QueueEvents } from "bullmq";
import { redis } from "./config/redisConnect"
const connection = redis

const queueName = "pageQueue";

const queue = new Queue(queueName, { connection });

(async () => {
    await queue.add("crawl", {
        url: "https://krmangalam.edu.in",
    });
    console.log("Job added");
})();

