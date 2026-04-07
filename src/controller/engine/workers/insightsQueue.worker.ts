import { Worker } from "bullmq";
import { DomainNode } from "../../../model/domainNode.model";
import { redis } from "../../../config/redisConnect";
import { dbFindOne, dbUpdate } from "../../../utils/dbUtils";
import { IDomainPage } from "../../../model/domainPage.model";
import { DomainNodeInsights } from "../../../model/domainInsights.model";

const safeNumber = (val: any) =>
    typeof val === "number" && !isNaN(val) ? val : 0;

const insightsQueueWorker = new Worker(
    "insightsQueue",
    async (job) => {
        const { domainNodeIds, comparedWithNodeId } = job.data;
        if (!domainNodeIds || !comparedWithNodeId) return;

        const baseNode = await dbFindOne(DomainNode, {
            _id: comparedWithNodeId,
            type: "baseNode",
        });
        if (!baseNode) throw new Error("Base node not found");

        await baseNode.populate<{ domainPages: IDomainPage[] }>("domainPages");
        const basePages = baseNode.domainPages as unknown as IDomainPage[];
        const basePagesMap = new Map<string, IDomainPage>();
        basePages.forEach((page) => {
            if (page.domainPageUrl) {
                basePagesMap.set(page.domainPageUrl, page);
            }
        });

        for (const nodeId of domainNodeIds) {
            const node = await dbFindOne(DomainNode, { _id: nodeId });
            if (!node) continue;

            await node.populate<{ domainPages: IDomainPage[] }>("domainPages");
            const nodePages = node.domainPages as unknown as IDomainPage[];

            let bestPage: IDomainPage | null = null;
            let worstPage: IDomainPage | null = null;
            let bestScore = -Infinity;
            let worstScore = Infinity;

            const seoDiffMap = new Map<string, number>();
            const technicalDiffs: Record<string, number> = {};

            let nodeTotal = 0;
            let baseTotal = 0;
            let matchedCount = 0;

            for (const page of nodePages) {
                const basePage = basePagesMap.get(page.domainPageUrl);

                if (!basePage) continue;

                const pageScore = safeNumber(page.overallScore);
                const baseScore = safeNumber(basePage.overallScore);

                const diff = pageScore - baseScore;

                nodeTotal += pageScore;
                baseTotal += baseScore;
                matchedCount++;

                if (diff > bestScore) {
                    bestScore = diff;
                    bestPage = page;
                }

                if (diff < worstScore) {
                    worstScore = diff;
                    worstPage = page;
                }

                if (Array.isArray(page.perCheckSeoScore)) {
                    for (const check of page.perCheckSeoScore) {
                        if (!check?.seoCheck) continue;

                        const baseCheck = (basePage.perCheckSeoScore || []).find(
                            (b) =>
                                b.seoCheck?.toString() ===
                                check.seoCheck?.toString()
                        );

                        const diffScore =
                            safeNumber(check.score) -
                            safeNumber(baseCheck?.score);

                        const key = check.seoCheck.toString();
                        seoDiffMap.set(key, (seoDiffMap.get(key) || 0) + diffScore);
                    }
                }

                const currTech = page.technicalSeo || {};
                const baseTech = basePage.technicalSeo || {};

                Object.keys(currTech).forEach((section) => {
                    const currSection: any = (currTech as any)[section];
                    const baseSection: any = (baseTech as any)[section];

                    if (
                        typeof currSection === "object" &&
                        typeof baseSection === "object"
                    ) {
                        Object.keys(currSection).forEach((key) => {
                            const currVal = currSection[key];
                            const baseVal = baseSection?.[key];

                            if (typeof currVal === "number") {
                                const diffVal =
                                    currVal - safeNumber(baseVal);

                                const mapKey = `${section}.${key}`;
                                technicalDiffs[mapKey] =
                                    (technicalDiffs[mapKey] || 0) + diffVal;
                            }
                        });
                    }
                });
            }

            const avgNode = matchedCount ? nodeTotal / matchedCount : 0;
            const avgBase = matchedCount ? baseTotal / matchedCount : 0;

            const seoDiffs = Array.from(seoDiffMap.entries()).map(
                ([seoCheck, scoreDifference]) => ({
                    seoCheck,
                    scoreDifference,
                })
            );

            await dbUpdate(
                DomainNodeInsights,
                {
                    domain: node.domain,
                    domainNode: node._id,
                    comparedWith: baseNode._id,
                    lastCalculatedAt: new Date(),
                    bestPage: bestPage?._id,
                    worstPage: worstPage?._id,
                    seoDifference: {
                        overallScore: avgNode - avgBase, 
                        perCheckSeoScores: seoDiffs,
                    },
                    technicalSeoDifference: technicalDiffs,
                },
                { domainNode: node._id },
                { upsert: true }
            );
        }
    },
    { connection: redis }
);

export default insightsQueueWorker;