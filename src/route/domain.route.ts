import { Express } from "express";
import { Router } from "express";
import { auth } from "../utils/auth";
import { requiredFields } from "../utils/requiredFields";
import { addSitemap, createDomain } from "../controller/domain.controller";
const domainRouter = Router();
domainRouter.post("/createDomain", requiredFields(["name"]), createDomain)
domainRouter.post("/addSitemap", auth, requiredFields(["sitemaps"]), addSitemap)
export default domainRouter;
