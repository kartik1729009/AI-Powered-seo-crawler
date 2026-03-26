import dotenv from "dotenv";
dotenv.config();
import { redis } from "../../../config/redisConnect";
import { pageQueue } from "../queues";
import { Worker, Job } from "bullmq"
import { crawlSitemap } from "../helpers/crawlSitemap.helper";
import { crawlWebPage } from "../helpers/crawlWebPage.helper";
import { DomainPage } from "../../../model/domainPage.model";
import { dbUpdate } from "../../../utils/dbUtils";
const worker = new Worker(
    "pageQueue",
    async (job: Job) => {
        if (!job.data || typeof job.data.url !== "string") {
            throw new Error("Invalid job data. URL must be string.");
        }
        const { url, domainId } = job.data;
        await dbUpdate(
            DomainPage,
            {
                "processing.pageQueue.status": "inProgress",
                "processing.pageQueue.startedAt": new Date(),
                "processing.overallStatus": "processing"
            },
            { domain: domainId, domainPageUrl: url },
            { upsert: true }
        );
        try {
            if (url.includes("sitemap.xml")) {
                await crawlSitemap(url, domainId);
            } else {
                await crawlWebPage(url, domainId);
            }
            await dbUpdate(
                DomainPage,
                {
                    "processing.pageQueue.status": "completed",
                    "processing.pageQueue.completedAt": new Date(),
                    "processing.progress": 20
                },
                { domain: domainId, domainPageUrl: url }
            );
        } catch (error: any) {
            await dbUpdate(
                DomainPage,
                {
                    "processing.pageQueue.status": "failed",
                    "processing.pageQueue.completedAt": new Date(),
                    "processing.pageQueue.error": error.message,
                    "processing.overallStatus": "failed"
                },
                { domain: domainId, domainPageUrl: url }
            );

            throw error;
        }
    },
    { connection: redis }
);
export default worker