import { ErrorContext, ErrorSeverity } from "../error/error.types";
import { SystemError } from "../error/systemError";
import * as loggers from "../utils/loggers"
import { Request, Response, NextFunction } from "express";
import { aiSummaryQueue, pageQueue } from "./engine/queues";
import { apiResponseHandler } from "../utils/apiResponseHandler";
import { dbFindOne } from "../utils/dbUtils";
import { DomainPage } from "../model/domainPage.model";
import mongoose from "mongoose";
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
        if (!domainId) {
            throw new Error("Unauthorized: domain not found in token");
        }
        if (!mongoose.Types.ObjectId.isValid(domainPageId)) {
            throw new Error("Invalid domainPageId");
        }
        if (!mongoose.Types.ObjectId.isValid(domainId)) {
            throw new Error("Invalid domainId");
        }
        const pageObjectId = new mongoose.Types.ObjectId(domainPageId);
        const domainObjectId = new mongoose.Types.ObjectId(domainId);
        const pageOnly = await dbFindOne(DomainPage, { _id: pageObjectId })
        if (!pageOnly) {
            throw new Error("Page does not exist in DB");
        }
        if (pageOnly.domain.toString() !== domainObjectId.toString()) {
            throw new Error("Page exists but does not belong to this domain");
        }
        await aiSummaryQueue.add(
            "aiSummary",
            { domainPageId, domainId },
            {
                jobId: `${domainId}_${domainPageId}`,
                attempts: 3,
            }
        );
        loggers.apiLogger.info("aiSummaryQueueEnqueue route: successful");
        return apiResponseHandler(res, {
            message: "domainPageId enqueued successfully",
            job: {
                domainId,
                domainPageId,
                url: pageOnly.domainPageUrl
            }
        });

    } catch (err: any) {
        loggers.apiLogger.error("aiSummaryQueueEnqueue route: failed");
        throw new SystemError({
            message: "Failed to enqueue to aiSummaryQueue",
            context: ErrorContext.QUEUE,
            source: "API",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "aiSummaryQueue.enqueue",
                payload: req.body,
                originalError: err.message
            }
        });
    }
}