import { Worker, Job } from "bullmq";
import dotenv from "dotenv";
import { redis } from "../../../config/redisConnect";
import * as loggers from "../../../utils/loggers"
import { dbFindOne, dbUpdate } from "../../../utils/dbUtils";
import { DomainPage } from "../../../model/domainPage.model";
import * as cheerio from "cheerio";
import { pageSeoQueue, technicalSeoQueue } from "../queues";

dotenv.config();

function normalizeHostname(hostname: string) {
    return hostname.replace(/^www\./, "");
}

function normalizeUrl(url: string) {
    return url.replace(/\/$/, "");
}

function getLocation($: cheerio.CheerioAPI, element: any) {
    if ($(element).closest("header").length > 0) return "Head";
    if ($(element).closest("footer").length > 0) return "Footer";
    if ($(element).closest("title").length > 0) return "Title";
    return "Body";
}

function aggregateLinks(links: any[]) {
    const map = new Map<string, any>();

    for (const link of links) {
        const key = link.url + "|" + link.location;

        if (map.has(key)) {
            map.get(key).count += 1;
        } else {
            map.set(key, {
                url: link.url,
                location: link.location,
                count: 1,
            });
        }
    }

    return Array.from(map.values());
}

const worker = new Worker(
    "infoQueue",
    async (job: Job) => {
        console.log("Incoming Job:", job.data);

        if (!job.data || typeof job.data.url !== "string") {
            throw new Error("Invalid job data. URL must be string.");
        }

        const { url, domainId, html } = job.data;

        await dbUpdate(
            DomainPage,
            {
                "processing.infoQueue.status": "inProgress",
                "processing.infoQueue.startedAt": new Date(),
                "processing.overallStatus": "processing"
            },
            { domain: domainId, domainPageUrl: url },
            { upsert: true }
        );

        try {
            const $ = cheerio.load(html);

            const baseHost = normalizeHostname(new URL(url).hostname);

            const internalLinks: any[] = [];
            const externalLinks: any[] = [];

            $("a[href]").each((_, element) => {
                let href = $(element).attr("href");

                if (!href) return;

                href = href.trim();

                if (
                    href.startsWith("#") ||
                    href.startsWith("javascript:") ||
                    href.startsWith("mailto:") ||
                    href.startsWith("tel:")
                ) {
                    return;
                }

                let absoluteUrl: string;

                try {
                    absoluteUrl = new URL(href, url).href;
                } catch {
                    return;
                }

                absoluteUrl = normalizeUrl(absoluteUrl);

                const linkHost = normalizeHostname(
                    new URL(absoluteUrl).hostname
                );

                const location = getLocation($, element);

                const linkData = {
                    url: absoluteUrl,
                    location,
                };

                if (linkHost === baseHost) {
                    internalLinks.push(linkData);
                } else {
                    externalLinks.push(linkData);
                }
            });

            const aggregatedInternal = aggregateLinks(internalLinks);
            const aggregatedExternal = aggregateLinks(externalLinks);

            await dbUpdate(
                DomainPage,
                { _id: domainId, domainPageUrl: url },
                {
                    pageLinks: {
                        internalLinks: aggregatedInternal,
                        externalLinks: aggregatedExternal,
                    },
                }
            );

            await dbUpdate(
                DomainPage,
                {
                    "processing.infoQueue.status": "completed",
                    "processing.infoQueue.completedAt": new Date(),
                    "processing.progress": 40
                },
                { domain: domainId, domainPageUrl: url }
            );

            const queue = pageSeoQueue;
            const secondQueue = technicalSeoQueue;

            loggers.workerLogger.info("infoQueue worker: successfull")

            return Promise.all([
                queue.add("pageSeoQueue", {
                    domainId,
                    url,
                    html
                }),
                secondQueue.add("technicalSeo", {
                    domainId,
                    url
                })
            ]);

        } catch (err: any) {

            await dbUpdate(
                DomainPage,
                {
                    "processing.infoQueue.status": "failed",
                    "processing.infoQueue.completedAt": new Date(),
                    "processing.infoQueue.error": err.message,
                    "processing.overallStatus": "failed"
                },
                { domain: domainId, domainPageUrl: url }
            );

        }
    },
    { connection: redis }
);

export default worker;