import * as loggers from './loggers'
import type {
    Model,
    HydratedDocument,
    UpdateQuery
} from "mongoose";

export async function dbUpdate<T>(
    model: Model<T>,
    fields: UpdateQuery<T>,
    uniqueQuery: any,
    options?: { upsert?: boolean }
) {
    if (!model || !model.schema) {
        throw new Error("Invalid model provided");
    }

    if (!fields || Object.keys(fields).length === 0) {
        throw new Error("No fields provided to update");
    }

    if (!uniqueQuery || Object.keys(uniqueQuery).length === 0) {
        throw new Error("No unique query provided for update");
    }

    return model.findOneAndUpdate(
        uniqueQuery,
        { $set: fields },
        {
            new: true,
            upsert: options?.upsert ?? false,
            runValidators: true
        }
    );
}
export async function dbFind<T>(
    model: Model<T>,
    field: Record<string, unknown>
): Promise<HydratedDocument<T>[]> {

    if (!model || !model.schema) {
        loggers.dbLogger.error("Invalid model provided to dbFind", { model });
        throw new Error("Invalid model provided");
    }

    const query = field && Object.keys(field).length > 0 ? field : {};

    try {
        const schemaFields = Object.keys(model.schema.paths);

        for (const key of Object.keys(query)) {
            if (key.startsWith("$")) continue;
            const rootField = key.split(".")[0];
            if (rootField === "_id" || rootField === "__v") continue;

            if (!schemaFields.includes(rootField)) {
                loggers.dbLogger.warn(
                    "Query field not in schema for dbFind",
                    { model, field: key }
                );
                throw new Error(
                    `Query field "${key}" is not defined in schema`
                );
            }
        }

        const documents = await model.find(query);
        return documents;

    } catch (err: any) {
        loggers.dbLogger.error("Error finding documents", err, {
            model,
            field
        });
        throw err;
    }
}

export async function dbFindOne<T>(
    model: Model<T>,
    field: Record<string, unknown>
): Promise<HydratedDocument<T> | null> {

    if (!model || !model.schema) {
        loggers.dbLogger.error("Invalid model provided to dbFindOne", { model });
        throw new Error("Invalid model provided");
    }

    if (!field || Object.keys(field).length === 0) {
        loggers.dbLogger.warn("No query field provided for dbFindOne", { model });
        throw new Error("No query field provided for dbFindOne");
    }

    const schemaFields = Object.keys(model.schema.paths);

    // ✅ FIXED HERE
    for (const key of Object.keys(field)) {

        if (key.startsWith("$")) continue;

        const rootField = key.split(".")[0];

        if (rootField === "_id" || rootField === "__v") continue;

        if (!schemaFields.includes(rootField)) {
            loggers.dbLogger.warn(
                "Query field not in schema for dbFindOne",
                { model, field: key }
            );
            throw new Error(
                `Query field "${key}" is not defined in schema`
            );
        }
    }

    try {
        const document = await model.findOne(field);

        if (!document) {
            loggers.dbLogger.warn("No document found for dbFindOne", { model, field });
            return null;
        }

        return document;

    } catch (err: any) {
        loggers.dbLogger.error("Error finding document", err, {
            model,
            field
        });
        throw err;
    }
}

export async function dbSave<T>(
    model: Model<T>,
    fields: Record<string, unknown>
) {
    if (!model || !model.schema) {
        loggers.dbLogger.error("Invalid model provided to dbSave", { model });
        throw new Error("Invalid model provided");
    }

    if (!fields || Object.keys(fields).length === 0) {
        loggers.dbLogger.warn("No fields provided to save", { model });
        throw new Error("No fields provided to save");
    }

    try {
        const schemaFields = Object.keys(model.schema.paths);

        for (const key of Object.keys(fields)) {
            if (key === "_id" || key === "__v") continue;

            if (!schemaFields.includes(key)) {
                loggers.dbLogger.warn("Field not in schema", {
                    model,
                    field: key
                });
                throw new Error(`Field "${key}" is not defined in schema`);
            }
        }

        const document = new model(fields);
        await document.save();
        return document;

    } catch (err: any) {
        loggers.dbLogger.error("Error saving document", {
            error: err,
            model,
            fields
        });

        if (err?.code === 11000) {
            throw new Error(
                "Duplicate key error: " + JSON.stringify(err.keyValue)
            );
        }

        throw err;
    }
}

export async function dbDelete<T>(
    model: Model<T>,
    field: Record<string, unknown>
): Promise<T | null> {
    if (!model || !model.schema) {
        loggers.dbLogger.error("Invalid model provided to dbDelete", { model });
        throw new Error("Invalid model provided");
    }

    if (!field || Object.keys(field).length === 0) {
        loggers.dbLogger.warn("No query field provided for dbDelete", { model });
        return null;
    }

    const schemaFields = Object.keys(model.schema.paths);

    for (const key of Object.keys(field)) {
        if (key.startsWith("$")) continue;

        const rootField = key.split(".")[0];
        if (rootField === "_id" || rootField === "__v") continue;

        if (!schemaFields.includes(rootField)) {
            loggers.dbLogger.warn(
                "Query field not in schema for dbDelete",
                { model, field: key }
            );
            throw new Error(`Query field "${key}" is not defined in schema`);
        }
    }

    try {
        const document = await model.findOneAndDelete(field);

        if (!document) {
            loggers.dbLogger.warn("No document found to delete", { model, field });
            return null; 
        }

        return document;
    } catch (err: any) {
        loggers.dbLogger.error("Error deleting document", err, { model, field });
        throw err;
    }
}
