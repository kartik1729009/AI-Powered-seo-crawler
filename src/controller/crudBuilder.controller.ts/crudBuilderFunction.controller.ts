import { Router } from 'express';
import * as loggers from '../../utils/loggers'
import { Model } from 'mongoose';
import { apiResponseHandler } from '../../utils/apiResponseHandler';
import { dbSave, dbFind, dbDelete, dbFindOne, dbUpdate } from '../../utils/dbUtils';
import { log } from 'node:console';


export function saveBuilder<T>(
    model: Model<T>
): Router {
    const router = Router();
    const modelName = model.modelName.toLowerCase();
    router.post(`/${modelName}/save`, async (req, res) => {
        try {
            const field = req.body;
            const document = await dbSave(model, field);
            return apiResponseHandler(res, document);
        } catch (err: any) {
            loggers.apiLogger.error("Error in saveBuilder route", err, { model: model.modelName, body: req.body });
            return apiResponseHandler(res, null, err);
        }
    })
    return router;
}

export function findBuilder<T>(
    model: Model<T>
): Router {
    const router = Router();
    const modelName = model.modelName.toLowerCase();
    router.get(`/${modelName}/find`, async (req, res) => {
        try {
            const field = req.query;
            const documents = await dbFind(model, field);
            return apiResponseHandler(res, documents);
        } catch (err: any) {
            loggers.apiLogger.error("Error in findBuilder route", err, { model: model.modelName, query: req.query });
            return apiResponseHandler(res, null, err);
        }
    })
    return router;

}

export function findOneBuilder<T>(
    model: Model<T>
): Router {
    const router = Router();
    const modelName = model.modelName.toLowerCase();

    router.post(`/${modelName}/findOne`, async (req, res) => {
        try {
            const field = req.body;
            if (!field || Object.keys(field).length === 0) {
                throw new Error("At least one field is required to find a document");
            }
            let query = model.findOne(field);
            if (model.modelName === "DomainNode") {
                query = query.populate("domain", "domainUrl");
            }
            const document = await query.exec();

            if (!document) {
                return res.status(404).json({
                    status: "error",
                    statusCode: 404,
                    message: `${model.modelName} not found`,
                    timestamp: new Date().toISOString()
                });
            }

            return apiResponseHandler(res, document);
        } catch (err: any) {
            loggers.apiLogger.error(
                "Error in findOneBuilder route",
                err,
                { model: model.modelName, body: req.body }
            );

            return apiResponseHandler(res, null, err);
        }
    });

    return router;
}

export function updateBuilder<T>(
    model: Model<T>
): Router {
    const router = Router();
    const modelName = model.modelName.toLowerCase();
    router.put(`/${modelName}/update`, async (req, res) => {
        try {
            const fields = req.body;
            const uniqueQuery = req.query;
            const document = await dbUpdate(model, fields, uniqueQuery);
            return apiResponseHandler(res, document);
        } catch (err: any) {
            loggers.apiLogger.error("Error in updateBuilder route", err, { model: model.modelName, query: req.query, body: req.body });
            return apiResponseHandler(res, null, err);
        }
    })
    return router;

}
export function deleteBuilder<T>(model: Model<T>): Router {
    const router = Router();
    const modelName = model.modelName.toLowerCase();

    router.post(`/${modelName}/delete`, async (req, res) => {
        try {
            const field = req.body;

            if (!field || Object.keys(field).length === 0) {
                loggers.apiLogger.warn(`deleteBuilder: No query provided for ${modelName}`, req.body);
                return apiResponseHandler(res, undefined, {
                    message: "Query fields required",
                    statusCode: 400,
                });
            }

            const document = await dbDelete(model, field);

            if (!document) {
                loggers.apiLogger.warn(`deleteBuilder: No document found for ${modelName}`, field);
                return apiResponseHandler(res, undefined, {
                    message: `${modelName} not found`,
                    statusCode: 404,
                });
            }
            loggers.apiLogger.info(`deleteBuilder: ${modelName} deleted successfully`, field);
            return apiResponseHandler(res, document);
        } catch (err: any) {
            loggers.apiLogger.error("Error in deleteBuilder route", {
                model: model.modelName,
                error: err instanceof Error ? err.stack : err,
            });
            return apiResponseHandler(res, undefined, err);
        }
    });

    return router;
}
