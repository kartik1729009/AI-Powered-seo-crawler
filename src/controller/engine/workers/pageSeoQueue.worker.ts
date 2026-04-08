import { Worker, Job } from "bullmq";
import { redis } from "../../../config/redisConnect";
import { DomainPage } from "../../../model/domainPage.model";
import { dbFind, dbFindOne, dbUpdate } from "../../../utils/dbUtils";
import * as cheerio from "cheerio";
import { SeoCheck } from "../../../model/seoChecks.model";
import { siteSeoQueue } from "../queues";

function getSourceData($: cheerio.CheerioAPI, check: any) {
    switch (check.source) {
        case "title":
            return $("title").text();

        case "meta_description":
            return $('meta[name="description"]').attr("content") || "";

        case "body":
            return $("body").text();

        case "headings":
            return $("h1, h2, h3, h4, h5, h6")
                .map((_: number, el: any) => $(el).text())
                .get()
                .join(" ");

        case "images":
            return $("img");

        case "anchors":
        case "internal_links":
        case "external_links":
            return $("a[href]");

        case "html":
        default:
            return $;
    }
}

function applyOperation(value: any, operation: string, target: any) {
    switch (operation) {
        case "includes":
            return String(value).includes(String(target));

        case "equals":
            return value === target;

        case "greater_than":
            return value > target;

        case "less_than":
            return value < target;

        case "range":
            return value >= target.min && value <= target.max;

        case "regex":
            return new RegExp(target).test(String(value));

        default:
            return false;
    }
}

function processCheck($: cheerio.CheerioAPI, check: any, page: any): number {
    const primaryKeyword =
        page?.keywords?.[0]?.keyword?.toLowerCase() || "";

    let data = getSourceData($, check);

    if (check.selector) {
        data = $(check.selector);
    } else {
        data = getSourceData($, check);
    }
    const getThresholdValue = (key: string, defaultValue: any = null) => {
        if (!check.thresholds) return defaultValue;

        if (check.thresholds[key] !== undefined) {
            return check.thresholds[key];
        }

        if (check.thresholds.min !== undefined || check.thresholds.max !== undefined) {
            if (key === 'min') return check.thresholds.min || defaultValue;
            if (key === 'max') return check.thresholds.max || defaultValue;
        }

        return defaultValue;
    };

    switch (check.checkType) {
        case "exists":
            if (typeof data === "string") return data.trim().length > 0 ? 1 : 0;
            if (data && typeof (data as any).length === "number") return (data as any).length > 0 ? 1 : 0;
            return 0;

        case "length_range": {
            let length = 0;

            if (typeof data === "string") length = data.length;
            else if (data && typeof (data as any).length === "number") length = (data as any).length;

            const min = getThresholdValue('min', 0);
            const max = getThresholdValue('max', Infinity);
            return length >= min && length <= max ? 1 : 0;
        }

        case "count": {
            const count = (data && typeof (data as any).length === "number") ? (data as any).length : 0;
            const target = check.thresholds || check.config?.target;
            return applyOperation(count, check.operation, target) ? 1 : 0;
        }

        case "keyword_in_text": {
            if (typeof data !== "string") return 0;
            return primaryKeyword && data.toLowerCase().includes(primaryKeyword)
                ? 1
                : 0;
        }

        case "keyword_in_first_n_words": {
            if (typeof data !== "string") return 0;

            const words = data
                .replace(/\s+/g, " ")
                .trim()
                .split(" ");

            const n = check.config?.wordLimit || 100;
            const firstWords = words.slice(0, n).join(" ");

            return primaryKeyword && firstWords.includes(primaryKeyword)
                ? 1
                : 0;
        }

        case "percentage_match": {
            if (!data || typeof (data as any).length !== "number" || (data as any).length === 0) return 0;
            if (typeof (data as any).each !== "function") return 0;

            let matchCount = 0;
            const cheerioData = data as any;

            cheerioData.each((index: number, element: any) => {
                const text = $(element).text().toLowerCase();
                if (primaryKeyword && text.includes(primaryKeyword)) {
                    matchCount++;
                }
            });

            return matchCount / (cheerioData.length || 1);
        }

        case "structure": {
            const headings = $("h1, h2, h3, h4, h5, h6").toArray();
            let lastLevel = 0;

            for (const el of headings) {
                const tagName = (el as any).tagName;
                if (tagName) {
                    const level = parseInt(tagName[1]);
                    if (level - lastLevel > 1) return 0;
                    lastLevel = level;
                }
            }

            return 1;
        }

        case "custom": {
            if (!check.selector) return 0;

            const elements = $(check.selector);
            if (!elements.length) return 0;

            if (check.attribute) {
                const attrValue =
                    elements.first().attr(check.attribute)?.trim() || "";
                return attrValue.length > 0 ? 1 : 0;
            }

            return elements.length > 0 ? 1 : 0;
        }

        default:
            return 0;
    }
}

function calculateScore(value: number, check: any): number {
    const getThresholdValue = (key: string, defaultValue: any = null) => {
        if (!check.thresholds) return defaultValue;

        if (check.thresholds[key] !== undefined) {
            return check.thresholds[key];
        }

        if (check.thresholds.min !== undefined || check.thresholds.max !== undefined) {
            if (key === 'min') return check.thresholds.min || defaultValue;
            if (key === 'max') return check.thresholds.max || defaultValue;
        }

        return defaultValue;
    };

    switch (check.scoringType) {
        case "binary":
            return value > 0 ? check.maxScore : 0;

        case "range": {
            const min = getThresholdValue('min', 0);
            const max = getThresholdValue('max', Infinity);
            return value >= min && value <= max ? check.maxScore : 0;
        }

        case "percentage":
            return Math.min(value, 1) * check.maxScore;

        default:
            return 0;
    }
}

const pageSeoWorker = new Worker(
    "pageSeoQueue",
    async (job: Job) => {
        const { domainId, url, html } = job.data;

        if (!html) throw new Error("HTML not found");

        await dbUpdate(
            DomainPage,
            {
                "processing.pageSeoQueue.status": "inProgress",
                "processing.pageSeoQueue.startedAt": new Date(),
                "processing.overallStatus": "processing"
            },
            { domain: domainId, domainPageUrl: url },
            { upsert: true }
        );

        try {
            const page = await dbFindOne(DomainPage, { domainPageUrl: url });
            if (!page) throw new Error("DomainPage not found");

            const $ = cheerio.load(html);
            const checks = await dbFind(SeoCheck, { isActive: true });

            const perCheckResults: any[] = [];
            let totalWeight = 0;
            let totalWeightedScore = 0;

            for (const check of checks) {
                const rawValue = processCheck($, check, page);
                const normalizedScore = calculateScore(rawValue, check);
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
                { domainPageUrl: url }
            );

            await dbUpdate(
                DomainPage,
                {
                    "processing.pageSeoQueue.status": "completed",
                    "processing.pageSeoQueue.completedAt": new Date(),
                    "processing.progress": 80
                },
                { domain: domainId, domainPageUrl: url }
            );

            await siteSeoQueue.add("site", {
                domainId: page.domain
            });

            return { success: true, score: finalPercentage };

        } catch (error: any) {
            await dbUpdate(
                DomainPage,
                {
                    "processing.pageSeoQueue.status": "failed",
                    "processing.pageSeoQueue.completedAt": new Date(),
                    "processing.pageSeoQueue.error": error.message,
                    "processing.overallStatus": "failed"
                },
                { domain: domainId, domainPageUrl: url }
            );

            throw error;
        }
    },
    { connection: redis,
        concurrency: 2,
        autorun: true,
        stalledInterval: 30000
     }
);

export default pageSeoWorker;