import { Worker } from "bullmq";
import { DomainNode } from "../../../model/domainNode.model";
import { redis } from "../../../config/redisConnect";
import { dbFindOne, dbUpdate } from "../../../utils/dbUtils";
import { IDomainPage } from "../../../model/domainPage.model";
import { DomainNodeInsights } from "../../../model/domainInsights.model";

const insightsQueueWorker = new Worker(
    "insightsQueue",
    async (job) => {
        const { domainNodeIds, comparedWithNodeId } = job.data;
        if (!domainNodeIds || !comparedWithNodeId) return;
        const baseNode = await dbFindOne(DomainNode, { _id: comparedWithNodeId, type: "baseNode" });
        if (!baseNode) throw new Error("Base node not found");

        await baseNode.populate<{ domainPages: IDomainPage[] }>("domainPages");
        const basePages = baseNode.domainPages as unknown as IDomainPage[];

        const basePagesMap = new Map<string, IDomainPage>();
        basePages.forEach((page) => basePagesMap.set(page._id.toString(), page));

        for (const nodeId of domainNodeIds) {
            const node = await dbFindOne(DomainNode, { _id: nodeId });
            if (!node) continue;
            await node.populate<{ domainPages: IDomainPage[] }>("domainPages");
            const nodePages = node.domainPages as unknown as IDomainPage[];
            let bestPage: IDomainPage | null = null;
            let worstPage: IDomainPage | null = null;
            let bestScore = -Infinity;
            let worstScore = Infinity;
            const seoDiffs: { seoCheck: any; scoreDifference: number }[] = [];
            const technicalDiffs: Record<string, any> = {};
            for (const page of nodePages) {
                const basePage = basePagesMap.get(page._id.toString());
                const pageScore = page.overallScore || 0;
                const baseScore = basePage?.overallScore || 0;
                const overallDiff = pageScore - baseScore;

                if (overallDiff > bestScore) {
                    bestScore = overallDiff;
                    bestPage = page;
                }
                if (overallDiff < worstScore) {
                    worstScore = overallDiff;
                    worstPage = page;
                }
                if (page.perCheckSeoScore && Array.isArray(page.perCheckSeoScore)) {
                    const perCheckDiffs = page.perCheckSeoScore
                        .filter((check): check is NonNullable<typeof check> => !!check && !!check.seoCheck)
                        .map((check) => {
                            const baseCheck = (basePage?.perCheckSeoScore || []).find(
                                (b) => b.seoCheck?.toString() === check.seoCheck?.toString()
                            );
                            return {
                                seoCheck: check.seoCheck,
                                scoreDifference: (check.score || 0) - (baseCheck?.score || 0),
                            };
                        });
                    seoDiffs.push(...perCheckDiffs);
                }

                if (page.technicalSeo) {
                    const technicalSeo = page.technicalSeo as any;
                    Object.keys(technicalSeo).forEach((key) => {
                        if (!technicalDiffs[key]) {
                            technicalDiffs[key] = technicalSeo[key];
                        }
                    });
                }
            }
            const nodeTotalScore = nodePages.reduce((sum, p) => sum + (p.overallScore || 0), 0);
            const baseTotalScore = basePages.reduce((sum, p) => sum + (p.overallScore || 0), 0);

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
                        overallScore: nodeTotalScore - baseTotalScore,
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