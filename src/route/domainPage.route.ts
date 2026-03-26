import {Router} from "express"
import { aiSummary, enqueueUrl, getAiSummaryEndpoint, getDomainPages, getDomainPageStatus } from "../controller/domainPage.controller";
import { auth } from "../utils/auth";
import { requiredFields } from "../utils/requiredFields";
const domainPageRouter = Router();
domainPageRouter.post("/enqueueUrl", auth, enqueueUrl)
domainPageRouter.post("/getDomainPageStatus", auth, requiredFields(["domainPageUrl"]), getDomainPageStatus)
domainPageRouter.post("/aiSummary", requiredFields(["domainPageId"]), auth, aiSummary)
domainPageRouter.post("/getDomainPages", auth, getDomainPages)
domainPageRouter.post("/getAiSummary", auth, getAiSummaryEndpoint);
export default domainPageRouter