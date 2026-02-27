import dotenv from "dotenv"
dotenv.config()
import { technicalSeoQueue } from "../queues"
import { Worker, Job } from "bullmq"
import { pageSpeedApiIntegration } from "../../../utils/pageSpeedApiIntegration"
import { dbUpdate } from "../../../utils/dbUtils"
import { DomainPage } from "../../../model/domainPage.model"
import { redis } from "../../../config/redisConnect"
const worker = new Worker(
    "technicalSeoQueue",
    async (job: Job) => {
        if (!job.data || typeof job.data.url !== "string") {
            throw new Error("Invalid job data. Url must be a string");
        }
        const { url, domainId } = job.data;
        const technicalSeoDetails = await pageSpeedApiIntegration(url);
        if (!technicalSeoDetails?.lighthouseResult) {
            throw new Error("Invalid PageSpeed response");
        }
        const lighthouse = technicalSeoDetails.lighthouseResult;
        const audits = lighthouse.audits;
        const categories = lighthouse.categories;
        const loadingExperience = technicalSeoDetails.loadingExperience;
        const technicalSeoPayload = {
            meta: {
                finalUrl: lighthouse.finalUrl,
                fetchTime: new Date(lighthouse.fetchTime),
                strategy: technicalSeoDetails.configSettings?.strategy
            },
            scores: {
                performance: categories.performance?.score
                    ? categories.performance.score * 100
                    : 0,
                seo: categories.seo?.score
                    ? categories.seo.score * 100
                    : 0,
                accessibility: categories.accessibility?.score
                    ? categories.accessibility.score * 100
                    : 0,
                bestPractices: categories["best-practices"]?.score
                    ? categories["best-practices"].score * 100
                    : 0,
            },
            coreWebVitals: {
                lcp: audits["largest-contentful-paint"]?.numericValue,
                fcp: audits["first-contentful-paint"]?.numericValue,
                cls: audits["cumulative-layout-shift"]?.numericValue,
                tbt: audits["total-blocking-time"]?.numericValue,
                speedIndex: audits["speed-index"]?.numericValue,
                tti: audits["interactive"]?.numericValue,
            },
            fieldData: {
                lcpPercentile: loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
                clsPercentile: loadingExperience?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile,
                fidPercentile: loadingExperience?.metrics?.FIRST_INPUT_DELAY_MS?.percentile,
                overallCategory: loadingExperience?.overall_category
            },
            security: {
                httpStatus: audits["http-status-code"]?.numericValue,
                https: audits["is-on-https"]?.score === 1
            },
            crawlability: {
                robotsTxt: audits["robots-txt"]?.score === 1,
                documentTitle: audits["document-title"]?.score === 1,
                metaDescription: audits["meta-description"]?.score === 1,
                canonical: audits["canonical"]?.score === 1,
                crawlableAnchors: audits["crawlable-anchors"]?.score === 1,
            },
            structuredData: audits["structured-data"]?.score === 1,
            diagnostics: {
                serverResponseTime: audits["server-response-time"]?.numericValue,
                domSize: audits["dom-size"]?.numericValue,
                totalByteWeight: audits["total-byte-weight"]?.numericValue,
                renderBlockingResources: audits["render-blocking-resources"]?.details,
                unusedCss: audits["unused-css-rules"]?.details,
                unusedJavascript: audits["unused-javascript"]?.details,
                networkRequests: audits["network-requests"]?.details,
                thirdPartySummary: audits["third-party-summary"]?.details,
            }
        };
        await dbUpdate(
            DomainPage,
            { technicalSeo: technicalSeoPayload },
            { domain: domainId, domainPageUrl: url }
        );
    },
    { connection: redis }
);
export default worker