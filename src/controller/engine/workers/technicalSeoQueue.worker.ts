import dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import { pageSpeedApiIntegration } from "../../../utils/pageSpeedApiIntegration";
import { dbUpdate } from "../../../utils/dbUtils";
import { DomainPage } from "../../../model/domainPage.model";
import { redis } from "../../../config/redisConnect";

const safeNumber = (val: any, fallback = 0): number =>
    typeof val === "number" && !isNaN(val) ? val : fallback;

const safeString = (val: any, fallback = ""): string =>
    typeof val === "string" ? val : fallback;

const safeBooleanFromScore = (val: any): boolean =>
    safeNumber(val) > 0;

const worker = new Worker(
    "technicalSeoQueue",
    async (job: Job) => {

        if (!job.data || typeof job.data.url !== "string") {
            throw new Error("Invalid job data. Url must be a string");
        }
        const { url, domainId } = job.data;
        await dbUpdate(
            DomainPage,
            {
                "processing.technicalQueue.status": "inProgress",
                "processing.technicalQueue.startedAt": new Date(),
                "processing.overallStatus": "processing"
            },
            { domain: domainId, domainPageUrl: url },
            { upsert: true }
        );
        try {
            const technicalSeoDetails = await pageSpeedApiIntegration(url);

            if (
                !technicalSeoDetails?.lighthouseResult ||
                !technicalSeoDetails?.lighthouseResult?.audits ||
                !technicalSeoDetails?.lighthouseResult?.categories
            ) {
                throw new Error("Invalid or incomplete PageSpeed response");
            }
            const lighthouse = technicalSeoDetails.lighthouseResult;
            const audits = lighthouse.audits;
            const categories = lighthouse.categories;
            const loadingExperience = technicalSeoDetails.loadingExperience;

            const technicalSeoPayload = {
                meta: {
                    finalUrl: safeString(lighthouse.finalUrl),
                    fetchTime: lighthouse.fetchTime
                        ? new Date(lighthouse.fetchTime)
                        : new Date(),
                    strategy: safeString(
                        technicalSeoDetails.configSettings?.strategy,
                        "desktop"
                    )
                },

                scores: {
                    performance: safeNumber(categories?.performance?.score) * 100,
                    seo: safeNumber(categories?.seo?.score) * 100,
                    accessibility: safeNumber(categories?.accessibility?.score) * 100,
                    bestPractices:
                        safeNumber(categories?.["best-practices"]?.score) * 100,
                },
                coreWebVitals: {
                    lcp: safeNumber(audits["largest-contentful-paint"]?.numericValue),
                    fcp: safeNumber(audits["first-contentful-paint"]?.numericValue),
                    cls: safeNumber(audits["cumulative-layout-shift"]?.numericValue),
                    tbt: safeNumber(audits["total-blocking-time"]?.numericValue),
                    speedIndex: safeNumber(audits["speed-index"]?.numericValue),
                    tti: safeNumber(audits["interactive"]?.numericValue),
                },
                fieldData: {
                    lcpPercentile: safeNumber(
                        loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile
                    ),
                    clsPercentile: safeNumber(
                        loadingExperience?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
                    ),
                    fidPercentile: safeNumber(
                        loadingExperience?.metrics?.FIRST_INPUT_DELAY_MS?.percentile
                    ),
                    overallCategory: safeString(
                        loadingExperience?.overall_category,
                        "NO_DATA"
                    )
                },
                security: {
                    httpStatus: safeNumber(
                        audits["http-status-code"]?.numericValue
                    ),
                    https:
                        safeNumber(audits["is-on-https"]?.score) === 1
                },
                crawlability: {
                    robotsTxt: safeBooleanFromScore(audits["robots-txt"]?.score),
                    documentTitle: safeBooleanFromScore(audits["document-title"]?.score),
                    metaDescription: safeBooleanFromScore(audits["meta-description"]?.score),
                    canonical: safeBooleanFromScore(audits["canonical"]?.score),
                    crawlableAnchors: safeBooleanFromScore(audits["crawlable-anchors"]?.score),
                },
                structuredData:
                    safeNumber(audits["structured-data"]?.score) === 1,

                diagnostics: {
                    serverResponseTime: safeNumber(
                        audits["server-response-time"]?.numericValue
                    ),
                    domSize: safeNumber(audits["dom-size"]?.numericValue),
                    totalByteWeight: safeNumber(
                        audits["total-byte-weight"]?.numericValue
                    ),
                    renderBlockingResources:
                        audits["render-blocking-resources"]?.details ?? {},
                    unusedCss: audits["unused-css-rules"]?.details ?? {},
                    unusedJavascript:
                        audits["unused-javascript"]?.details ?? {},
                    networkRequests:
                        audits["network-requests"]?.details ?? {},
                    thirdPartySummary:
                        audits["third-party-summary"]?.details ?? {},
                }
            };

            await dbUpdate(
                DomainPage,
                { technicalSeo: technicalSeoPayload },
                { domain: domainId, domainPageUrl: url }
            );

            await dbUpdate(
                DomainPage,
                {
                    "processing.technicalQueue.status": "completed",
                    "processing.technicalQueue.completedAt": new Date(),
                    "processing.progress": 60
                },
                { domain: domainId, domainPageUrl: url }
            );

        } catch (error: any) {

            await dbUpdate(
                DomainPage,
                {
                    "processing.technicalQueue.status": "failed",
                    "processing.technicalQueue.completedAt": new Date(),
                    "processing.technicalQueue.error": error.message,
                    "processing.overallStatus": "failed"
                },
                { domain: domainId, domainPageUrl: url }
            );

            throw error;
        }
    },
    {
        connection: redis,
        concurrency: 2,
        autorun: true,
        stalledInterval: 30000
    }
);

export default worker;