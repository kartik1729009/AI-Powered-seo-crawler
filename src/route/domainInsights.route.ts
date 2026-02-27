import { Router } from "express";
import { auth } from "../utils/auth";
import { requiredFields } from "../utils/requiredFields";
import { nodeInsights } from "../controller/domainInsights.controller";
const domainNodeInsightsRouter = Router();
domainNodeInsightsRouter.post("/nodeInsights", auth, requiredFields(["domainNodes"]), nodeInsights)
export default domainNodeInsightsRouter;
