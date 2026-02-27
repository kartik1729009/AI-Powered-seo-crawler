import dotenv from "dotenv";
dotenv.config();
import { redis } from "../../../config/redisConnect";
import { pageQueue } from "../queues";
import { Worker, Job } from "bullmq"
import { crawlSitemap } from "../helpers/crawlSitemap.helper";
import { crawlWebPage } from "../helpers/crawlWebPage.helper";
const worker = new Worker(
    "pageQueue",
    async (job) => {
        console.log("Incoming job:", job.data);

        if (!job.data || typeof job.data.url !== "string") {
            throw new Error("Invalid job data. URL must be string.");
        }

        const url = job.data.url;
        const domainId = job.data.domainId;
        console.log("webPage url: ", url);
        if (url.includes("sitemap.xml")) {
            crawlSitemap(url, domainId);
        } else {
            console.log("URL received in crawlWebPage:", url);
            crawlWebPage(url, domainId);
        }
    },
    { connection: redis }
);
export default worker;