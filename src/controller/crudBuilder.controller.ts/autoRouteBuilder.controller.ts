import { Router } from "express";
import { Model } from "mongoose";
import { saveBuilder, updateBuilder, findBuilder, findOneBuilder, deleteBuilder } from "./crudBuilderFunction.controller";
type CrudOperation = "save" | "update" | "find" | "findOne" | "delete";
export function autoCrudBuilder<T>(model: Model<T>, operations: CrudOperation[]): Router {
    const router = Router();
     operations.forEach(op => {
        switch (op) {
            case "save":
                router.use(saveBuilder(model));
                break;
            case "update":
                router.use(updateBuilder(model));
                break;
            case "find":
                router.use(findBuilder(model));
                break;
            case "findOne":
                router.use(findOneBuilder(model));
                break;
            case "delete":
                router.use(deleteBuilder(model));
                break;
            default:
                throw new Error(`Invalid CRUD operation: ${op}`);
        }
    });

    return router;
}
