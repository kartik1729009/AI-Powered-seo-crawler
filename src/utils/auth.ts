import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import * as loggers from "../utils/loggers";
const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";
export function auth(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            loggers.apiLogger.warn("No Authorization header found", { path: req.path });
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }
        const tokenParts = authHeader.split(" ");
        if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
            loggers.apiLogger.warn("Invalid Authorization header format", { path: req.path });
            return res.status(401).json({ message: "Unauthorized: Invalid token format" });
        }

        const token = tokenParts[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (err: any) {
        loggers.apiLogger.warn("JWT verification failed", { path: req.path, error: err.message });
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
}
export function generateToken(
    payload: Record<string, unknown>,
    expiresIn: string = "1h"
): string {
    const options: SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign(payload, JWT_SECRET, options);
}
