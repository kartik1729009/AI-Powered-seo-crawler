import dotenv from "dotenv";
dotenv.config();
import { Worker, Job } from "bullmq";
import { dbFindOne, dbUpdate } from "../../../utils/dbUtils";
import { DomainPage } from "../../../model/domainPage.model";
import { generateSeoReport } from "../../../utils/geminiIntegration";
import { redis } from "../../../config/redisConnect";

const worker = new Worker(
    "aiSummaryQueue",
    async (job: Job) => {
        if (!job.data) {
            throw new Error("Job data not present");
        }

        const { domainPageId, prompt } = job.data;

        if (!prompt) {
            throw new Error("Prompt not provided in job data");
        }

        const page = await dbFindOne(DomainPage, { _id: domainPageId });
        if (!page) {
            throw new Error("domainPage not found");
        }

        // Generate SEO summary using prompt from job
        const generateSeo = await generateSeoReport(prompt);

        await dbUpdate(
            DomainPage,
            {
                aiSummary: generateSeo,
                "processing.pageSeoQueue.status": "completed",
                "processing.overallStatus": "completed",
            },
            { _id: domainPageId }
        );

        console.log("Generated summary:", generateSeo);
    },
    { connection: redis }
);

export default worker;