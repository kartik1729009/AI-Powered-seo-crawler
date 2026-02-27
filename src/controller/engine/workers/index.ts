import dotenv from "dotenv";
dotenv.config();
import * as loggers from "../../../utils/loggers";
import infoWorker from "./infoQueue.worker";
import PageWorker from "./pageQueue.worker";
import technicalSeoWorker from "./technicalSeoQueue.worker"
import pageSeoWorker from "./pageSeoQueue.worker";
import sitemapSeoWorker from "./siteSeoQueue.worker";
import aiSummaryQueueWorker from "./aiSummaryQueue.worker";
import { insightsQueueWorker } from "./insightsQueue.worker";
import { connectDB } from "../../../config/db";

async function start() {
    await connectDB();
    loggers.workerLogger.info("all workers are up");
    console.log("http://localhost:3000/admin/queues");
}
start();
process.on("SIGINT", async () => {
    await PageWorker.close();
    await infoWorker.close();
    await technicalSeoWorker.close();
    await pageSeoWorker.close();
    await sitemapSeoWorker.close();
    await aiSummaryQueueWorker.close();
    await insightsQueueWorker.close();
    process.exit(0);
});
