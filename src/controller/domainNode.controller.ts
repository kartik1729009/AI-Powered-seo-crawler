import { Request, Response } from "express";
import * as loggers from "../utils/loggers";
import { SystemError } from "../error/systemError";
import { ErrorContext, ErrorSeverity } from "../error/error.types";
import { apiResponseHandler } from "../utils/apiResponseHandler";
import { dbFind, dbFindOne, dbSave, dbUpdate } from "../utils/dbUtils";
import { DomainPage } from "../model/domainPage.model";
import { DomainNode } from "../model/domainNode.model";
export async function createOrUpdateDomainNode(req: Request, res: Response) {
    try {
        const { nodePath, type } = req.body;
        const domainId = (req as any).user?.domainId;
        if (!domainId) {
            throw new Error("Unauthorized: domain not found in token");
        }
        if (!nodePath) {
            throw new Error("nodePath is required");
        }
        const pages = await dbFind(DomainPage, {
            domain: domainId,
            isActive: true,
            domainPageUrl: { $regex: nodePath, $options: "i" },
        });
        const totalPages = pages.length;
        let totalSeoScore = 0;
        let totalTechnicalSeoScore = 0;
        const pageIds: any[] = [];
        for (const page of pages) {
            if (page.seoScore) {
                totalSeoScore += page.seoScore;
            }
            if (page.technicalSeo?.scores?.seo) {
                totalTechnicalSeoScore += page.technicalSeo.scores.seo;
            }
            pageIds.push(page._id);
        }
        const averageSeoScore =
            totalPages > 0 ? totalSeoScore / totalPages : 0;
        const averageTechnicalSeoScore =
            totalPages > 0 ? totalTechnicalSeoScore / totalPages : 0;
        const overallScore =
            totalPages > 0
                ? (averageSeoScore + averageTechnicalSeoScore) / 2
                : 0;

        const analytics = {
            averageSeoScore,
            averageTechnicalSeoScore,
            overallScore,
            totalPages,
            lastCalculatedAt: new Date(),
        };
        const existingNode = await dbFindOne(DomainNode, {
            domain: domainId,
            nodePath,
        });

        if (existingNode) {
            await dbUpdate(
                DomainNode,
                { _id: existingNode._id },
                {
                    domainPages: pageIds,
                    analytics,
                    lastEvaluatedAt: new Date(),
                }
            );
            return apiResponseHandler(res, "Node updated successfully");
        }
        await dbSave(DomainNode, {
            domain: domainId,
            type: type || "baseNode",
            nodePath,
            domainPages: pageIds,
            analytics,
            lastEvaluatedAt: new Date(),
        });
        return apiResponseHandler(res, "Node created successfully");
    } catch (err: any) {
        loggers.apiLogger.info("createOrUpdateDomainNode route: failed");
        apiResponseHandler(res, undefined, err);
        throw new SystemError({
            message: "Failed to create/update domain node",
            context: ErrorContext.API,
            source: "API",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "createOrUpdateDomainNode",
                payload: req.body,
                originalError: err.message,
            },
        });
    }
}