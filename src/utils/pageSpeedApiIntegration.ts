import { ErrorContext, ErrorSeverity } from "../error/error.types";
import { SystemError } from "../error/systemError";
import dotenv from "dotenv"
import * as loggers from "./loggers"
import axios from "axios"
dotenv.config();
const API = process.env.PAGE_SPEED_API
export async function pageSpeedApiIntegration(url: string) {
    try {
        if (!API) {
            throw new Error("PAGE_SPEED_API key not configured");
        }
        const response = await axios.get(
            "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
            {
                params: {
                    url,
                    key: API,
                    strategy: "desktop",
                    category: ["performance", "seo", "best-practices", "accessibility"]
                },
                timeout: 180000
            }
        );
        return response.data;
    } catch (err: any) {
        loggers.apiLogger.error("pageSpeedApi integration: failed");
        throw new SystemError({
            message: "failed to integrate pageSpeedApi",
            context: ErrorContext.API,
            source: "FUNCTION",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "PageSpeedApiIntegration",
                originalError: err.message
            }
        })
    }
}