import mongoose, { Schema, Types } from "mongoose";

const aggregatedScoreSchema = new Schema(
    {
        averageSeoScore: {
            type: Number,
            min: 0,
            max: 100,
        },

        averageTechnicalSeoScore: {
            type: Number,
            min: 0,
            max: 100,
        },

        overallScore: {
            type: Number,
            min: 0,
            max: 100,
        },

        totalPages: {
            type: Number,
            default: 0,
        },

        lastCalculatedAt: {
            type: Date,
        },
    },
    { _id: false }
);

const domainNodeSchema = new Schema(
    {
        domain: {
            type: Types.ObjectId,
            ref: "Domain",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["baseNode", "customNode"],
            default: "baseNode",
        },
        nodePath: {
            type: String,
            required: true,
            trim: true,
        },
        domainPages: [
            {
                type: Types.ObjectId,
                ref: "DomainPage",
            },
        ],
        analytics: {
            type: aggregatedScoreSchema,
            default: () => ({
                averageSeoScore: 0,
                averageTechnicalSeoScore: 0,
                overallScore: 0,
                totalPages: 0,
                lastCalculatedAt: null,
            }),
        },
        aiSummary: {
            type: String,
            trim: true,
        },
        lastEvaluatedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);
domainNodeSchema.index({ domain: 1, nodePath: 1 }, { unique: true });
domainNodeSchema.index({ "analytics.overallScore": -1 });

export const DomainNode = mongoose.model("DomainNode", domainNodeSchema);