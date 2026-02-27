import {Router} from "express"
import { aiSummary, enqueueUrl } from "../controller/domainPage.controller";
import { auth } from "../utils/auth";
import { requiredFields } from "../utils/requiredFields";
const domainPageRouter = Router();
domainPageRouter.post("/enqueueUrl", auth, enqueueUrl)
domainPageRouter.post("/aiSummary", requiredFields(["domainPageId"]), auth, aiSummary)
export default domainPageRouter