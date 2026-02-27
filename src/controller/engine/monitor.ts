import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { infoQueue, insightsQueue, pageQueue, technicalSeoQueue, pageSeoQueue, siteSeoQueue, aiSummaryQueue } from './queues';
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [
        new BullMQAdapter(pageQueue),
        new BullMQAdapter(infoQueue),
        new BullMQAdapter(technicalSeoQueue),
        new BullMQAdapter(insightsQueue),
        new BullMQAdapter(pageSeoQueue),
        new BullMQAdapter(siteSeoQueue),
        new BullMQAdapter(aiSummaryQueue)
    ],
    serverAdapter,
})
export const bullBoardRouter = serverAdapter.getRouter();