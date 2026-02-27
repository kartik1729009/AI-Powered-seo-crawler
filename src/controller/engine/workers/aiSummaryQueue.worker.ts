import dotenv from "dotenv"
dotenv.config()
import { Worker, Job } from "bullmq"
import { dbFindOne, dbUpdate } from "../../../utils/dbUtils"
import { DomainPage } from "../../../model/domainPage.model";
import { generateSeoReport } from "../../../utils/geminiIntegration";
import { redis } from "../../../config/redisConnect";
const worker = new Worker(
    "aiSummaryQueue",
    async (job: Job) => {
        if (!job.data) {
            throw new Error("Job not present")
        }
        const { domainPageId } = job.data;
        const page = await dbFindOne(DomainPage, { _id: domainPageId });
        if (!page) {
            throw new Error("domainPage not found");
        }
        const formattedChecks = page.perCheckSeoScore.map((check: any) => ({
            name: check.seoCheck.name,
            category: check.seoCheck.category,
            description: check.seoCheck.description,
            weight: check.seoCheck.weight,
            priority: check.seoCheck.priority,
            score: check.score
        }));
        const allScores = {
            seoChecks: formattedChecks,
            technical: page.technicalSeo,
            overallScore: page.overallScore
        }
        const generateSeo = await generateSeoReport(allScores);
        await dbUpdate(
            DomainPage,
            { aiSummary: generateSeo },
            { _id: domainPageId }
        );
    },
    { connection: redis }
)
export default worker;
