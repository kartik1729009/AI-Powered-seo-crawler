import { ErrorContext, ErrorSeverity } from "../error/error.types";
import { SystemError } from "../error/systemError";
import * as loggers from "../utils/loggers"
import { Request, Response, NextFunction } from "express";
import { aiSummaryQueue, pageQueue } from "./engine/queues";
import { apiResponseHandler } from "../utils/apiResponseHandler";
import { dbFind, dbFindOne, dbUpdate } from "../utils/dbUtils";
import { DomainPage } from "../model/domainPage.model";
import mongoose, {Types} from "mongoose";
export async function enqueueUrl(req: Request, res: Response) {
    try {
        const { url } = req.body
        const domainId = (req as any).user?.domainId;
        if (!domainId) {
            throw new Error("Unauthorized: domain not found in token")
        }
        if (!url || typeof url !== "string") {
            throw new Error("Invalid URL");
        }
        await pageQueue.add(
            "crawl",
            { domainId, url },
            {
                jobId: `${domainId}:${url}`,
                attempts: 3,
                backoff: { type: "exponential", delay: 2000 },
            }
        );
        loggers.apiLogger.info("enqueueUrl route: successful")
        return apiResponseHandler(res, {
            message: "URL enqueued successfully",
            job: {
                domainId,
                url
            }
        });

    } catch (err: any) {
        loggers.apiLogger.error("enqueueUrl route: failed");
        throw new SystemError({
            message: "Filed to enqueue to pageQueue",
            context: ErrorContext.QUEUE,
            source: "API",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "pageQueue.enqueue",
                payload: req.body,
                originalError: err.message
            }
        })
    }
}

export async function aiSummary(req: Request, res: Response) {
    try {
        const { domainPageId } = req.body;
        const domainId = (req as any).user?.domainId;

        if (!domainId) throw new Error("Unauthorized: domain not found in token");
        if (!mongoose.Types.ObjectId.isValid(domainPageId)) throw new Error("Invalid domainPageId");

        const pageObjectId = new Types.ObjectId(domainPageId);

        // ----- Populate seoCheck to safely access its properties -----
        const pageOnly = await dbFindOne(DomainPage, { _id: pageObjectId });
        if (!pageOnly) throw new Error("Page does not exist");

        // Populate nested SEO checks safely
        await pageOnly.populate("perCheckSeoScore.seoCheck");

        // Now build your formatted prompt
        const formattedChecks = pageOnly.perCheckSeoScore.map((check: any) => ({
            name: check.seoCheck?.name || "Unknown",
            category: check.seoCheck?.category || "Unknown",
            description: check.seoCheck?.description || "No description",
            weight: check.seoCheck?.weight || 0,
            priority: check.seoCheck?.priority || "normal",
            score: check.score,
        }));

        const allScores = {
            seoChecks: formattedChecks,
            technical: pageOnly.technicalSeo,
            overallScore: pageOnly.overallScore,
        };

        const prompt = `
You are an expert senior SEO analyst.

You are analyzing a single domain page based on structured SEO evaluation data.

Your task is to:

1. Identify what is wrong or weak in this domain page based on the provided scores.
2. Clearly explain why those weaknesses matter.
3. Provide actionable improvements.
4. Separate improvements into:
- SEO Score improvements (content, headings, meta, keyword usage, structure, etc.)
- Technical SEO improvements (performance, indexing, crawlability, schema, etc.)

Be analytical and precise.
Do NOT hallucinate missing data.
Base your reasoning strictly on the provided input.

INPUT DATA:
${JSON.stringify(allScores, null, 2)}

OUTPUT FORMAT (STRICTLY FOLLOW THIS FORMAT):

what is wrong with the domainPage
-----
<Clear explanation of weaknesses and lagging areas based on scores>

improvement:
seoScoreImprovement:
- <bullet points with clear actionable suggestions>
- <prioritized improvements>
- <mention how it improves score>

technicalSeoImprovement:
- <bullet points with technical fixes>
- <performance / indexing / crawl improvements>
- <mention how it improves score>

Rules:
- Do NOT add any extra sections.
- Do NOT repeat the input.
- Do NOT include generic SEO advice.
- Only give insights relevant to the provided data.
- Keep it concise but powerful.
`;

        // ----- Add job with prompt -----
        const job = await aiSummaryQueue.add(
            "aiSummary",
            { domainPageId, domainId, prompt },
            { attempts: 3 }
        );

        loggers.apiLogger.info("Job successfully added to aiSummaryQueue", { jobId: job.id });

        return apiResponseHandler(res, {
            message: "domainPageId enqueued successfully",
            job: {
                domainId,
                domainPageId,
                url: pageOnly.domainPageUrl,
            },
        });

    } catch (err: any) {
        loggers.apiLogger.error("aiSummaryQueueEnqueue route: failed", err);

        return apiResponseHandler(res, {
            status: "error",
            message: err.message || "Failed to enqueue to aiSummaryQueue",
        }, 500);
    }
}

export async function getAiSummaryEndpoint(req: Request, res: Response) {
    try {
        const { domainPageId } = req.body;

        if (!domainPageId || !mongoose.Types.ObjectId.isValid(domainPageId)) {
            return res.status(400).json({ error: "Invalid domainPageId" });
        }

        // Use your custom dbFindOne method
        const page = await dbFindOne(DomainPage, { _id: domainPageId });
        if (!page) {
            return res.status(404).json({ error: "Page not found" });
        }

        // Check if AI summary exists
        const summary = page.aiSummary
            ? {
                title: "Page Summary",
                content: page.aiSummary,
                keyPoints: [],
            }
            : null;

        return res.json({
            summary,
            page: {
                url: page.domainPageUrl,
                title: page.domainPageUrl,
                crawledAt: page.createdAt,
            },
            // For frontend polling, return processing status if you want
            processingStatus: page.processing?.pageQueue?.status || "pending",
        });
    } catch (err: any) {
        loggers.apiLogger.error("getAiSummaryEndpoint failed", err);
        return res.status(500).json({
            status: "error",
            message: err.message || "Failed to fetch AI summary",
        });
    }
}


export async function getDomainPageStatus(req: Request, res: Response) {
    try {

        const { domainPageUrl } = req.body;

        if (!domainPageUrl || typeof domainPageUrl !== "string") {
            throw new Error("Invalid domainPageUrl");
        }

        const page = await dbFindOne(
            DomainPage,
            { domainPageUrl }
        );

        if (!page) {
            return apiResponseHandler(res, {
                message: "Page not found",
                processing: {
                    overallStatus: "queued",
                    progress: 0
                }
            });
        }

        return apiResponseHandler(res, {
            message: "Status fetched successfully",
            domainPageUrl: page.domainPageUrl,
            processing: page.processing
        });

    } catch (err: any) {

        loggers.apiLogger.error("getDomainPageStatus route: failed");

        throw new SystemError({
            message: "Failed to fetch page status",
            context: ErrorContext.API,
            source: "API",
            severity: ErrorSeverity.MEDIUM,
            metadata: {
                operation: "domainPage.status",
                payload: req.body,
                originalError: err.message
            }
        });
    }
}

export async function getDomainPages(req: Request, res: Response) {
    try {
        const domainId = (req as any).user?.domainId;

        if (!domainId) {
            throw new Error("Unauthorized: domain not found in token");
        }
        const domainPages = await dbFind(DomainPage, { domain: domainId });
        const pages = domainPages.map(page => ({
            _id: page._id,
            domainPageUrl: page.domainPageUrl
        }));

        return apiResponseHandler(res, {
            message: "Domain pages fetched successfully",
            pages
        });

    } catch (err: any) {
        loggers.apiLogger.error("getDomainPages route: failed");

        throw new SystemError({
            message: "Failed to fetch domain pages",
            context: ErrorContext.API,
            source: "API",
            severity: ErrorSeverity.MEDIUM,
            metadata: {
                operation: "domainPages.fetch",
                payload: req.body,
                originalError: err.message
            }
        });
    }
}
