import { Worker, Job } from "bullmq";
import { redis } from "../../../config/redisConnect";
import { dbFindOne, dbFind, dbUpdate, dbSave } from "../../../utils/dbUtils";
import { DomainNode } from "../../../model/domainNode.model";
import { DomainPage } from "../../../model/domainPage.model";
import * as loggers from "../../../utils/loggers";
import { DomainNodeInsights } from "../../../model/domainInsights.model";
import worker from "./aiSummaryQueue.worker";
export const insightsQueueWorker = new Worker(
    "insightsQueue",
    async (job: Job) => {
        try {
            const { domainId, domainNodeId } = job.data;
            const node = await dbFindOne(DomainNode, {
                _id: domainNodeId,
                domain: domainId,
            });
            if (!node) throw new Error("DomainNode not found");
            const baseNode = await dbFindOne(DomainNode, {
                domain: domainId,
                type: "baseNode",
            });
            if (!baseNode) throw new Error("Base node not found");
            const pages = await dbFind(DomainPage, {
                _id: { $in: node.domainPages },
                isActive: true,
            });
            if (!pages.length) {
                throw new Error("No pages found for node");
            }
            let bestPage = pages[0];
            let worstPage = pages[0];

            for (const page of pages) {
                if ((page.overallScore || 0) > (bestPage.overallScore || 0)) {
                    bestPage = page;
                }
                if ((page.overallScore || 0) < (worstPage.overallScore || 0)) {
                    worstPage = page;
                }
            }
            const seoScoreDifference =
                (baseNode.analytics?.averageSeoScore || 0) -
                (node.analytics?.averageSeoScore || 0);

            const performanceDifference =
                (baseNode.analytics?.averageTechnicalSeoScore || 0) -
                (node.analytics?.averageTechnicalSeoScore || 0);

            const improvementOpportunities = {
                seo: {
                    seoScoreDifference,
                    potentialOverallGain: seoScoreDifference / 2,
                },
                technicalSeo: {
                    performanceDifference,
                },
            };
            const insightPayload = {
                domain: domainId,
                domainNode: node._id,
                insights: {
                    bestPage: bestPage._id,
                    worstPage: worstPage._id,
                    comparedWith: baseNode._id,
                    improvementOpportunities,
                    lastCalculatedAt: new Date(),
                },
            };
            const existingInsight = await dbFindOne(
                DomainNodeInsights,
                { domain: domainId, domainNode: node._id }
            );
            if (existingInsight) {
                await dbUpdate(
                    DomainNodeInsights,
                    { _id: existingInsight._id },
                    insightPayload
                );
            } else {
                await dbSave(DomainNodeInsights, insightPayload);
            }
            loggers.apiLogger.info(
                `Insight generated for node ${node._id}`
            );
        } catch (err: any) {
            loggers.apiLogger.error(
                `Insight Worker Failed: ${err.message}`
            );
            throw err;
        }
    },
    { connection: redis }
);
export default worker;