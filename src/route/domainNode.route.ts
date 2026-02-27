import {Router} from "express"
import { auth } from "../utils/auth";
import { requiredFields } from "../utils/requiredFields";
import { createOrUpdateDomainNode } from "../controller/domainNode.controller";
const domainNodeRouter = Router();
domainNodeRouter.post("/aiSummary", requiredFields(["nodePath", "type"]), auth, createOrUpdateDomainNode)
export default domainNodeRouter