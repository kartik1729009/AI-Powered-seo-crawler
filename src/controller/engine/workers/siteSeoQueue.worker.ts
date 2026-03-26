import { Worker, Job } from "bullmq";
import { redis } from "../../../config/redisConnect";
import { Domain } from "../../../model/domain.model";
import { DomainPage } from "../../../model/domainPage.model";
import { dbFind, dbFindOne, dbUpdate } from "../../../utils/dbUtils";
import mongoose from "mongoose";

const sitemapSeoWorker = new Worker(
    "siteSeoQueue",
    async (job: Job) => {
        const { domainId } = job.data;

        if (!mongoose.Types.ObjectId.isValid(domainId)) {
            throw new Error("Invalid domainId");
        }

        await dbUpdate(
            DomainPage,
            {
                "processing.siteSeoQueue.status": "inProgress",
                "processing.siteSeoQueue.startedAt": new Date(),
                "processing.overallStatus": "processing"
            },
            { domain: domainId },
            { upsert: true }
        );

        try {

            const domain = await dbFindOne(Domain, { _id: domainId });
            if (!domain) throw new Error("Domain not found");

            const allPages = await dbFind(DomainPage, { domain: domainId });

            const updatedSitemaps = [...domain.domainSitemap];

            for (let i = 0; i < updatedSitemaps.length; i++) {
                const sitemap = updatedSitemaps[i];

                const sitemapOrigin = new URL(sitemap.url).origin;

                const pages = allPages.filter((page) =>
                    page.domainPageUrl.startsWith(sitemapOrigin)
                );

                const issues: any[] = [];
                const hashMap = new Map<string, string[]>();
                const keywordMap = new Map<string, string[]>();

                for (const page of pages) {

                    if (page.domainPageHtmlHash) {
                        if (!hashMap.has(page.domainPageHtmlHash)) {
                            hashMap.set(page.domainPageHtmlHash, []);
                        }
                        hashMap.get(page.domainPageHtmlHash)!.push(page.domainPageUrl);
                    }

                    if (page.keywords?.length) {
                        for (const kw of page.keywords) {
                            if (!keywordMap.has(kw.keyword)) {
                                keywordMap.set(kw.keyword, []);
                            }
                            keywordMap.get(kw.keyword)!.push(page.domainPageUrl);
                        }
                    }
                }

                for (const [, urls] of hashMap.entries()) {
                    if (urls.length > 1) {
                        issues.push({
                            type: "duplicate_content",
                            urls
                        });
                    }
                }

                for (const [keyword, urls] of keywordMap.entries()) {
                    if (urls.length > 1) {
                        issues.push({
                            type: "keyword_cannibalization",
                            keyword,
                            urls
                        });
                    }
                }

                for (const page of pages) {
                    if (typeof page.seoScore === "number" && page.seoScore < 50) {
                        issues.push({
                            type: "low_seo_score",
                            url: page.domainPageUrl,
                            score: page.seoScore
                        });
                    }
                }

                const totalPages = pages.length;
                const totalIssues = issues.length;

                let score = 100 - totalIssues * 2;
                if (score < 0) score = 0;

                updatedSitemaps[i].sitemapSeoResult = {
                    score,
                    totalPages,
                    totalIssues,
                    issues
                };
            }

            await dbUpdate(
                Domain,
                { domainSitemap: updatedSitemaps },
                { _id: domainId }
            );

            await dbUpdate(
                DomainPage,
                {
                    "processing.siteSeoQueue.status": "completed",
                    "processing.siteSeoQueue.completedAt": new Date(),
                    "processing.progress": 100
                },
                { domain: domainId }
            );

            return { success: true };

        } catch (error: any) {

            await dbUpdate(
                DomainPage,
                {
                    "processing.siteSeoQueue.status": "failed",
                    "processing.siteSeoQueue.completedAt": new Date(),
                    "processing.siteSeoQueue.error": error.message,
                    "processing.overallStatus": "failed"
                },
                { domain: domainId }
            );

            throw error;
        }
    },
    { connection: redis }
);

export default sitemapSeoWorker;