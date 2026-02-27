import { Request, Response } from "express";
import * as loggers from "../utils/loggers";
import { SystemError } from "../error/systemError";
import { ErrorContext, ErrorSeverity } from "../error/error.types";
import { apiResponseHandler } from "../utils/apiResponseHandler";
import { dbFind } from "../utils/dbUtils";
import { DomainNode } from "../model/domainNode.model";
import { insightsQueue } from "./engine/queues";
export async function nodeInsights(req: Request, res: Response) {
    try {
        const { domainNodes } = req.body;
        const domainId = (req as any).user?.domainId;
        if (!domainId) {
            throw new Error("Unauthorized: domain not found in token");
        }
        if (!Array.isArray(domainNodes) || domainNodes.length === 0) {
            throw new Error("domainNodes must be a non-empty array");
        }
        const validNodes = await dbFind(DomainNode, {
            _id: { $in: domainNodes },
            domain: domainId,
        });
        if (!validNodes.length) {
            throw new Error("No valid domain nodes found");
        }
        await Promise.all(
            validNodes.map((node: any) =>
                insightsQueue.add("generateInsight", {
                    domainId,
                    domainNodeId: node._id,
                })
            )
        );
        return apiResponseHandler(
            res,
            "Insights queued successfully"
        );
    } catch (err: any) {
        loggers.apiLogger.info("nodeInsights route: failed");
        apiResponseHandler(res, undefined, err);
        throw new SystemError({
            message: "Failed to enqueue insightsQueue",
            context: ErrorContext.API,
            source: "API",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "nodeInsights enqueue",
                payload: req.body,
                originalError: err.message,
            },
        });
    }
}