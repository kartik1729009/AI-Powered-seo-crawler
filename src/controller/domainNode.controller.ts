import { Request, Response } from "express";
import * as loggers from "../utils/loggers";
import { SystemError } from "../error/systemError";
import { ErrorContext, ErrorSeverity } from "../error/error.types";
import { apiResponseHandler } from "../utils/apiResponseHandler";
import { dbFind, dbFindOne, dbSave, dbUpdate } from "../utils/dbUtils";
import { DomainPage, IDomainPage } from "../model/domainPage.model";
import { DomainNode, IDomainNode } from "../model/domainNode.model";
import { nodeSummaryQueue } from "./engine/queues";
import { Types } from "mongoose";
export async function createOrUpdateDomainNode(req: Request, res: Response) {
    try {
        const { nodePath, type } = req.body;
        const domainId = (req as any).user?.domainId;

        if (!domainId) throw new Error("Unauthorized: domain not found in token");
        if (!nodePath) throw new Error("nodePath is required");

        // Fetch active pages for this node
        const pages: IDomainPage[] = await dbFind(DomainPage, {
            domain: domainId,
            isActive: true,
            domainPageUrl: { $regex: nodePath, $options: "i" },
        });

        const totalPages = pages.length;
        let totalSeoScore = 0;
        let totalTechnicalSeoScore = 0;

        // Initialize aggregated technical SEO with proper typing
        const aggregatedTechnicalSeo: IDomainNode["technicalSeoAnalytics"] = {
            scores: { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 },
            coreWebVitals: { lcp: 0, fcp: 0, cls: 0, tbt: 0, speedIndex: 0, tti: 0 },
            fieldData: { lcpPercentile: 0, clsPercentile: 0, fidPercentile: 0, overallCategory: "" },
            crawlability: { robotsTxt: true, documentTitle: true, metaDescription: true, canonical: true, crawlableAnchors: true },
            security: { httpStatus: 200, https: true },
            diagnostics: {},
        };

        const pageIds: Types.ObjectId[] = [];
        const keywordMap: Record<string, any> = {};

        for (const page of pages) {
            pageIds.push(page._id);

            if (page.seoScore) totalSeoScore += page.seoScore;
            if (page.technicalSeo?.scores?.seo) totalTechnicalSeoScore += page.technicalSeo.scores.seo;

            // Aggregate technical SEO scores
            if (page.technicalSeo?.scores) {
                if (page.technicalSeo.scores.performance) {
                    aggregatedTechnicalSeo.scores!.performance! += page.technicalSeo.scores.performance;
                }
                if (page.technicalSeo.scores.seo) {
                    aggregatedTechnicalSeo.scores!.seo! += page.technicalSeo.scores.seo;
                }
                if (page.technicalSeo.scores.accessibility) {
                    aggregatedTechnicalSeo.scores!.accessibility! += page.technicalSeo.scores.accessibility;
                }
                if (page.technicalSeo.scores.bestPractices) {
                    aggregatedTechnicalSeo.scores!.bestPractices! += page.technicalSeo.scores.bestPractices;
                }
            }

            // Aggregate core web vitals
            if (page.technicalSeo?.coreWebVitals) {
                const cwv = page.technicalSeo.coreWebVitals;
                if (cwv.lcp) aggregatedTechnicalSeo.coreWebVitals!.lcp! += cwv.lcp;
                if (cwv.fcp) aggregatedTechnicalSeo.coreWebVitals!.fcp! += cwv.fcp;
                if (cwv.cls) aggregatedTechnicalSeo.coreWebVitals!.cls! += cwv.cls;
                if (cwv.tbt) aggregatedTechnicalSeo.coreWebVitals!.tbt! += cwv.tbt;
                if (cwv.speedIndex) aggregatedTechnicalSeo.coreWebVitals!.speedIndex! += cwv.speedIndex;
                if (cwv.tti) aggregatedTechnicalSeo.coreWebVitals!.tti! += cwv.tti;
            }

            // Aggregate field data
            if (page.technicalSeo?.fieldData) {
                const fd = page.technicalSeo.fieldData;
                if (fd.lcpPercentile) aggregatedTechnicalSeo.fieldData!.lcpPercentile! += fd.lcpPercentile;
                if (fd.clsPercentile) aggregatedTechnicalSeo.fieldData!.clsPercentile! += fd.clsPercentile;
                if (fd.fidPercentile) aggregatedTechnicalSeo.fieldData!.fidPercentile! += fd.fidPercentile;
                if (fd.overallCategory && !aggregatedTechnicalSeo.fieldData!.overallCategory) {
                    aggregatedTechnicalSeo.fieldData!.overallCategory = fd.overallCategory;
                }
            }

            // Aggregate keywords - FIXED: Removed toObject check
            if (page.keywords && Array.isArray(page.keywords)) {
                for (const kw of page.keywords) {
                    // Convert kw to plain object if it's a Mongoose document
                    const keywordObj = typeof kw === 'object' && kw !== null ?
                        (JSON.parse(JSON.stringify(kw))) : kw;

                    if (!keywordMap[keywordObj.keyword]) {
                        keywordMap[keywordObj.keyword] = { ...keywordObj };
                    } else {
                        keywordMap[keywordObj.keyword].frequency += keywordObj.frequency;
                        keywordMap[keywordObj.keyword].inTitle = keywordMap[keywordObj.keyword].inTitle || keywordObj.inTitle;
                        keywordMap[keywordObj.keyword].inH1 = keywordMap[keywordObj.keyword].inH1 || keywordObj.inH1;
                        keywordMap[keywordObj.keyword].inMeta = keywordMap[keywordObj.keyword].inMeta || keywordObj.inMeta;
                        if (!keywordMap[keywordObj.keyword].firstPosition ||
                            (keywordObj.firstPosition && keywordObj.firstPosition < keywordMap[keywordObj.keyword].firstPosition)) {
                            keywordMap[keywordObj.keyword].firstPosition = keywordObj.firstPosition;
                        }
                    }
                }
            }
        }

        // Compute averages
        const averageSeoScore = totalPages > 0 ? totalSeoScore / totalPages : 0;
        const averageTechnicalSeoScore = totalPages > 0 ? totalTechnicalSeoScore / totalPages : 0;
        const overallScore = totalPages > 0 ? (averageSeoScore + averageTechnicalSeoScore) / 2 : 0;

        const avgField = (value: number) => (totalPages > 0 ? value / totalPages : 0);

        // Calculate averages for scores
        if (aggregatedTechnicalSeo.scores) {
            aggregatedTechnicalSeo.scores.performance = avgField(aggregatedTechnicalSeo.scores.performance || 0);
            aggregatedTechnicalSeo.scores.seo = avgField(aggregatedTechnicalSeo.scores.seo || 0);
            aggregatedTechnicalSeo.scores.accessibility = avgField(aggregatedTechnicalSeo.scores.accessibility || 0);
            aggregatedTechnicalSeo.scores.bestPractices = avgField(aggregatedTechnicalSeo.scores.bestPractices || 0);
        }

        // Calculate averages for core web vitals
        if (aggregatedTechnicalSeo.coreWebVitals) {
            aggregatedTechnicalSeo.coreWebVitals.lcp = avgField(aggregatedTechnicalSeo.coreWebVitals.lcp || 0);
            aggregatedTechnicalSeo.coreWebVitals.fcp = avgField(aggregatedTechnicalSeo.coreWebVitals.fcp || 0);
            aggregatedTechnicalSeo.coreWebVitals.cls = avgField(aggregatedTechnicalSeo.coreWebVitals.cls || 0);
            aggregatedTechnicalSeo.coreWebVitals.tbt = avgField(aggregatedTechnicalSeo.coreWebVitals.tbt || 0);
            aggregatedTechnicalSeo.coreWebVitals.speedIndex = avgField(aggregatedTechnicalSeo.coreWebVitals.speedIndex || 0);
            aggregatedTechnicalSeo.coreWebVitals.tti = avgField(aggregatedTechnicalSeo.coreWebVitals.tti || 0);
        }

        // Calculate averages for field data
        if (aggregatedTechnicalSeo.fieldData) {
            aggregatedTechnicalSeo.fieldData.lcpPercentile = avgField(aggregatedTechnicalSeo.fieldData.lcpPercentile || 0);
            aggregatedTechnicalSeo.fieldData.clsPercentile = avgField(aggregatedTechnicalSeo.fieldData.clsPercentile || 0);
            aggregatedTechnicalSeo.fieldData.fidPercentile = avgField(aggregatedTechnicalSeo.fieldData.fidPercentile || 0);
        }

        const analytics = {
            averageSeoScore,
            averageTechnicalSeoScore,
            overallScore,
            totalPages,
            lastCalculatedAt: new Date(),
        };

        const keywords = Object.values(keywordMap);

        // Prepare update data with proper typing
        const updateData: Partial<IDomainNode> = {
            domain: new Types.ObjectId(domainId),
            nodePath,
            type: type || "baseNode",
            domainPages: pageIds,
            analytics,
            technicalSeoAnalytics: aggregatedTechnicalSeo,
            keywords,
            lastEvaluatedAt: new Date(),
        };

        // Upsert domain node
        await dbUpdate(
            DomainNode,
            updateData,
            { domain: domainId, nodePath },
            { upsert: true }
        );

        return apiResponseHandler(res, "Domain node created/updated successfully");
    } catch (err: any) {
        loggers.apiLogger.error("createOrUpdateDomainNode failed", { error: err });
        return apiResponseHandler(res, undefined, err);
    }
}
export async function domainNodeAiReport(req: Request, res:Response) {
    try{
        const { domainNodeId } = req.body
        const domainId = (req as any).user?.header
        if (!domainId) {
            throw new Error("Unauthorzed access");
        }
        const queue = nodeSummaryQueue;
        await queue.add(
            "domainNodeSummary",
            { domainId, domainNodeId },
            {
                jobId: `${domainId}:${domainNodeId}`,
                attempts: 3,
                backoff: { type: "exponential", delay: 2000 },
            }
        )
        loggers.apiLogger.info("enqueueNode route: success");
        return apiResponseHandler(res, {
            message: "domainNode enqueued successfully",
            job: {
                domainId,
                domainNode:domainNodeId
            }
        })
    }catch (err: any) {
            loggers.apiLogger.error("enqueueUrl route: failed");
            throw new SystemError({
                message: "Filed to enqueue to domainNodeSummary",
                context: ErrorContext.QUEUE,
                source: "API",
                severity: ErrorSeverity.HIGH,
                metadata: {
                    operation: "domainNodeSummary.enqueue",
                    payload: req.body,
                    originalError: err.message
                }
            })
        }
}
export async function getAllNodes(req: Request, res: Response) {
    try {
        const domainId = (req as any).user?.domainId;
        if (!domainId) {
            throw new Error("Unauthorized: domain not found in token");
        }
        const nodes = await dbFind(DomainNode, { domain: domainId });
        loggers.apiLogger.info(`getAllNodes: fetched ${nodes.length} nodes`);
        return apiResponseHandler(res, {
            message: "Domain nodes fetched successfully",
            nodes,
        });
    } catch (err: any) {
        loggers.apiLogger.error("getAllNodes route: failed", err);

        throw new SystemError({
            message: "Failed to fetch domain nodes",
            context: ErrorContext.API,
            source: "API",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "getAllNodes",
                payload: req.body,
                originalError: err.message,
            },
        });
    }
}