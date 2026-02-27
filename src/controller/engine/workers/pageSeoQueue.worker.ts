import { Worker, Job } from "bullmq";
import { redis } from "../../../config/redisConnect";
import { DomainPage } from "../../../model/domainPage.model";
import { dbFind, dbFindOne, dbUpdate } from "../../../utils/dbUtils";
import * as cheerio from "cheerio";
import { SeoCheck } from "../../../model/seoChecks.model";
import { siteSeoQueue } from "../queues";

function extractValue($: cheerio.CheerioAPI, check: any): number {
    const elements = $(check.selector);
    if (!elements.length) return 0;

    if (check.attribute) {
        const attrValue = elements.first().attr(check.attribute)?.trim() || "";
        return attrValue.length;
    }

    if (elements.length > 1) {
        return elements.length;
    }

    return elements.first().text().trim().length;
}

function calculateScore(value: number, check: any): number {
    switch (check.scoringType) {
        case "binary":
            return value > 0 ? 1 : 0;

        case "range": {
            const min = check.thresholds?.min ?? 0;
            const max = check.thresholds?.max ?? Infinity;

            if (value === 0) return 0;
            if (value >= min && value <= max) return 1;
            return 0.5;
        }

        case "percentage": {
            const max = check.thresholds?.max ?? 0;
            if (!max) return 0;
            return Math.min(value / max, 1);
        }

        default:
            return 0;
    }
}

const pageSeoWorker = new Worker(
    "pageSeoQueue",
    async (job: Job) => {
        const { domainId, url, html } = job.data;

        if (!html) throw new Error("HTML not found");

        const page = await dbFindOne(DomainPage, { domainPageUrl: url });
        
        if (!page) throw new Error("DomainPage not found");

        const $ = cheerio.load(html);

        const checks = await dbFind(SeoCheck, { isActive: true });

        const perCheckResults: any[] = [];
        let totalWeight = 0;
        let totalWeightedScore = 0;

        for (const check of checks) {
            if (!check.selector) continue;

            const value = extractValue($, check);
            const normalizedScore = calculateScore(value, check);

            const weightedScore = normalizedScore * check.weight;

            totalWeight += check.weight;
            totalWeightedScore += weightedScore;

            perCheckResults.push({
                seoCheck: check._id,
                score: normalizedScore,
            });
        }

        const finalScore =
            totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

        const finalPercentage = Math.round(finalScore * 100);

        await dbUpdate(
            DomainPage,
            {
                seoScore: finalPercentage,
                perCheckSeoScore: perCheckResults,
                overallScore: finalPercentage
            },
            { domainPageUrl : url }
        );
        await siteSeoQueue.add("site", {
            domainId: page.domain
        });

        return { success: true, score: finalPercentage };
    },
    { connection: redis }
);
export default pageSeoWorker;