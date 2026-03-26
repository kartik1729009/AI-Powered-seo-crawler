import {Queue} from "bullmq";
import {redis} from "../../config/redisConnect";
const defaultOptions = {
    removeOnComplete: {
        age: 12 * 60 * 60,
        count: 5000,
    },
    removeOnFail: {
        age: 24 * 60 * 60,
        count: 10000,
    },
};
export const pageQueue = new Queue("pageQueue", {
    connection: redis,
    defaultJobOptions: defaultOptions,
});
export const infoQueue = new Queue("infoQueue", {
    connection: redis,
    defaultJobOptions: defaultOptions,
})
export const pageSeoQueue = new Queue("pageSeoQueue", {
    connection: redis,
    defaultJobOptions: defaultOptions,
})
export const technicalSeoQueue = new Queue("technicalSeoQueue", {
    connection: redis,
    defaultJobOptions: defaultOptions,
})
export const siteSeoQueue = new Queue("siteSeoQueue", {
    connection: redis,
    defaultJobOptions: defaultOptions,
})
export const insightsQueue = new Queue("insightsQueue", {
    connection: redis,
    defaultJobOptions: defaultOptions,
})
export const aiSummaryQueue = new Queue("aiSummaryQueue", {
    connection: redis,
    defaultJobOptions: defaultOptions,
})
export const nodeSummaryQueue = new Queue("nodeSummaryQueue", {
    connection: redis,
    defaultJobOptions: defaultOptions
})