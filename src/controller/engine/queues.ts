import {Queue} from "bullmq";
import {redis} from "../../config/redisConnect";
import {queueLogger} from "../../utils/loggers";
import { connection } from "mongoose";

export const pageQueue = new Queue("pageQueue", {
    connection: redis
});
export const infoQueue = new Queue("infoQueue", {
    connection: redis
})
export const pageSeoQueue = new Queue("pageSeoQueue", {
    connection: redis
})
export const technicalSeoQueue = new Queue("technicalSeoQueue", {
    connection: redis
})
export const siteSeoQueue = new Queue("siteSeoQueue", {
    connection: redis
})
export const insightsQueue = new Queue("insightsQueue", {
    connection: redis
})
export const aiSummaryQueue = new Queue("aiSummaryQueue", {
    connection: redis
})