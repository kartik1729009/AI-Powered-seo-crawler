import {Router} from "express"
import { auth } from "../utils/auth";
import { requiredFields } from "../utils/requiredFields";
import { createOrUpdateDomainNode, domainNodeAiReport, getAllNodes } from "../controller/domainNode.controller";
const domainNodeRouter = Router();
domainNodeRouter.post("/domainNodeAiReport", requiredFields(["domainNode"]), auth, domainNodeAiReport)
domainNodeRouter.post("/createOrUpdateDomainNode", requiredFields(["nodePath", "type"]), auth, createOrUpdateDomainNode)
domainNodeRouter.post("/getAllNodes", auth, getAllNodes)
export default domainNodeRouter