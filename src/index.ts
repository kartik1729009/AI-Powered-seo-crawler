import express from "express";
import { env } from "./config/env";
import { createLogger } from "./utils/logger";
import { connectDB } from "./config/db";
import { autoCrudBuilder } from "./controller/crudBuilder.controller.ts/autoRouteBuilder.controller";
import { model } from "./model/exportModel.model"
import { bullBoardRouter } from "./controller/engine/monitor";
import  domainRouter  from "./route/domain.route";
import domainNodeInsightsRouter from "./route/domainInsights.route";
import domainNodeRouter from "./route/domainNode.route";
import domainPageRouter from "./route/domainPage.route";
const appLogger = createLogger("APP");
const dbLogger = createLogger("DATABASE");
const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
model.forEach(models => {
  if (models && typeof (models as any).modelName === "string") {
    app.use(autoCrudBuilder(models as any, ["save", "update", "find", "findOne", "delete"]));
  } else {
    appLogger.warn("Skipped non-Mongoose export in model list", { name: (models as any)?.constructor?.name });
  }
})
app.use("/domain", domainRouter);
app.use('/domainPage', domainPageRouter);
app.use('/domainNode', domainNodeRouter);
app.use('/domainNodeInsights', domainNodeInsightsRouter)
const startServer = async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      appLogger.info(`Server started on port ${env.PORT}`);
    });
  } catch (err) {
    appLogger.error("Failed to start server", err);
    process.exit(1);
  }
};
app.use('/admin/queues', bullBoardRouter);

startServer();

process.on("unhandledRejection", (reason) => {
  appLogger.error("Unhandled Promise Rejection", reason);
});

process.on("uncaughtException", (err) => {
  appLogger.error("Uncaught Exception", err);
  process.exit(1);
});
