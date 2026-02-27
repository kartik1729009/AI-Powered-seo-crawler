import crypto from "crypto"
import { Domain } from "../model/domain.model";
import { Request, Response } from "express";
import { apiResponseHandler } from "../utils/apiResponseHandler";
import { dbFind, dbFindOne, dbSave, dbUpdate } from "../utils/dbUtils";
import * as loggers from "../utils/loggers"
import { SystemError } from "../error/systemError";
import jwt from "jsonwebtoken"
import { InferSchemaType, Types } from "mongoose";
import { ErrorContext, ErrorSource, ErrorSeverity } from "../error/error.types";

export async function createDomain(req: Request, res: Response){
    try {
        const { name } = req.body;
        let domain = await dbFindOne(Domain, { name });
        if (!domain) {
            domain = await dbSave(Domain, { name });
        }
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET not defined");
        }
        const token = jwt.sign(
            { domainId: domain._id },
            process.env.JWT_SECRET,
            { expiresIn: "2d" }
        );
        return apiResponseHandler(res, {
            domain,
            token
        });
    } catch (err: any) {
        loggers.apiLogger.error("createDomain route: failed", err);
        apiResponseHandler(res, undefined, err);
        new SystemError({
            message: "Failed to create domain",
            context: ErrorContext.DATABASE,
            source: "CONTROLLER",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "Domain.create",
                payload: req.body,
                originalError: err.message
            }
        });
    }
}
export async function addSitemap(req: Request, res: Response){
    try {
        const { sitemaps } = req.body;
        const domainId = (req as any).user?.domainId;
        if (!domainId) {
            throw new Error("Unauthorized: domain not found in token");
        }
        if (!Array.isArray(sitemaps) || sitemaps.length === 0) {
            throw new Error("Invalid sitemap payload");
        }
        const existingDomain = await dbFindOne(Domain, { _id: domainId });
        if (!existingDomain) {
            throw new Error("Domain not found");
        }
        const formattedSitemaps = sitemaps.map((sitemap: any) => {

            const hash = crypto
                .createHash("sha256")
                .update(
                    JSON.stringify({
                        url: sitemap.url,
                        lastModified: sitemap.lastModified
                    })
                )
                .digest("hex");
            return {
                url: sitemap.url,
                lastModified: new Date(sitemap.lastModified),
                xmlHash: hash
            };
        });
        const existingHashes = new Set(
            existingDomain.domainSitemap.map((item: any) => item.xmlHash)
        );
        const filteredNew = formattedSitemaps.filter(
            (item: any) => !existingHashes.has(item.xmlHash)
        );
        if (filteredNew.length === 0) {
            return apiResponseHandler(res, existingDomain);
        }
        const updatedArray = [
            ...existingDomain.domainSitemap,
            ...filteredNew
        ];
        const updatedDomain = await dbUpdate(
            Domain,
            { domainSitemap: updatedArray },
            { _id: domainId  }
        );
        loggers.apiLogger.info("addSitemap route: successfull")
        return apiResponseHandler(res, updatedDomain);
    }
    catch(err: any){
        loggers.apiLogger.error("addSitemap route: failed", err)
        apiResponseHandler(res, undefined, err);
        new SystemError({
            message: "failed to add sitemap",
            context: ErrorContext.DATABASE,
            source: "CONTROLLER",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "Domain.addSitemat",
                payload: req.body,
                originalError: err.message
            }
        });
    }
}