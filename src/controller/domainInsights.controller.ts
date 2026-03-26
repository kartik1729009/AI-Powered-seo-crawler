import { Request, Response } from "express";
import { DomainNode } from "../model/domainNode.model";
import { insightsQueue } from "./engine/queues";
import { dbFindOne, dbFind } from "../utils/dbUtils";

export const nodeInsights = async (req: Request, res: Response) => {
    try {
        const { domainNodes } = req.body;
        if (!domainNodes || !Array.isArray(domainNodes) || domainNodes.length === 0) {
            return res.status(400).json({ message: "domainNodes required" });
        }

        // Fetch all nodes
        const nodes = await dbFind(DomainNode, { _id: { $in: domainNodes } });

        if (!nodes || nodes.length === 0) {
            return res.status(404).json({ message: "No nodes found" });
        }

        // Group nodes by domain
        const nodesByDomain: Record<string, any[]> = {};
        for (const node of nodes) {
            const domainId = node.domain.toString();
            if (!nodesByDomain[domainId]) {
                nodesByDomain[domainId] = [];
            }
            nodesByDomain[domainId].push(node);
        }

        const BATCH_SIZE = 50;
        let totalEnqueued = 0;

        // Process each domain separately
        for (const [domainId, domainNodes] of Object.entries(nodesByDomain)) {
            // Fetch base node for this domain
            const baseNode = await dbFindOne(DomainNode, {
                domain: domainId,
                type: "baseNode"
            });

            if (!baseNode) {
                console.warn(`Base node not found for domain ${domainId}, skipping...`);
                continue;
            }

            // Process nodes in batches
            for (let i = 0; i < domainNodes.length; i += BATCH_SIZE) {
                const batch = domainNodes.slice(i, i + BATCH_SIZE);

                await insightsQueue.add("calculateInsights", {
                    domainNodeIds: batch.map((n) => n._id),
                    comparedWithNodeId: baseNode._id,
                });

                totalEnqueued += batch.length;
            }
        }

        return res.status(200).json({
            message: "Enqueued insights jobs",
            totalNodes: nodes.length,
            totalEnqueued,
            domainsProcessed: Object.keys(nodesByDomain).length
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to enqueue insights" });
    }
};