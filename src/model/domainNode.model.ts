import mongoose, { Schema, Types, Document } from "mongoose";
import { DomainPage, IDomainPage } from "./domainPage.model"; // for type reference

// Aggregated SEO & technical scores per node
const aggregatedScoreSchema = new Schema(
    {
        averageSeoScore: { type: Number, min: 0, max: 100, default: 0 },
        averageTechnicalSeoScore: { type: Number, min: 0, max: 100, default: 0 },
        overallScore: { type: Number, min: 0, max: 100, default: 0 },
        totalPages: { type: Number, default: 0 },
        lastCalculatedAt: { type: Date },
    },
    { _id: false }
);

// Aggregated technical SEO info
const aggregatedTechnicalSeoSchema = new Schema(
    {
        scores: {
            performance: Number,
            seo: Number,
            accessibility: Number,
            bestPractices: Number,
        },
        coreWebVitals: {
            lcp: Number,
            fcp: Number,
            cls: Number,
            tbt: Number,
            speedIndex: Number,
            tti: Number,
        },
        fieldData: {
            lcpPercentile: Number,
            clsPercentile: Number,
            fidPercentile: Number,
            overallCategory: String,
        },
        crawlability: {
            robotsTxt: Boolean,
            documentTitle: Boolean,
            metaDescription: Boolean,
            canonical: Boolean,
            crawlableAnchors: Boolean,
        },
        security: {
            httpStatus: Number,
            https: Boolean,
        },
        diagnostics: Schema.Types.Mixed,
    },
    { _id: false }
);

const domainNodeSchema = new Schema(
    {
        domain: { type: Types.ObjectId, ref: "Domain", required: true, index: true },
        type: { type: String, enum: ["baseNode", "customNode"], default: "baseNode" },
        nodePath: { type: String, required: true, trim: true },
        domainPages: [{ type: Types.ObjectId, ref: "DomainPage" }],

        // Full aggregated analytics
        analytics: { type: aggregatedScoreSchema, default: () => ({}) },
        technicalSeoAnalytics: { type: aggregatedTechnicalSeoSchema, default: () => ({}) },

        // Keywords aggregated from pages
        keywords: [
            {
                keyword: { type: String, required: true },
                frequency: { type: Number, required: true },
                inTitle: { type: Boolean, default: false },
                inH1: { type: Boolean, default: false },
                inMeta: { type: Boolean, default: false },
                firstPosition: Number,
            },
        ],

        // Optional AI summary for the node
        aiSummary: { type: String, trim: true },

        lastEvaluatedAt: { type: Date },
    },
    { timestamps: true }
);

// Indexes
domainNodeSchema.index({ domain: 1, nodePath: 1 }, { unique: true });
domainNodeSchema.index({ "analytics.overallScore": -1 });

export interface IDomainNode extends Document {
    domain: Types.ObjectId;
    type: "baseNode" | "customNode";
    nodePath: string;
    domainPages: Types.ObjectId[] | IDomainPage[];

    analytics: {
        averageSeoScore: number;
        averageTechnicalSeoScore: number;
        overallScore: number;
        totalPages: number;
        lastCalculatedAt?: Date;
    };
    technicalSeoAnalytics: {
        scores?: { performance?: number; seo?: number; accessibility?: number; bestPractices?: number };
        coreWebVitals?: { lcp?: number; fcp?: number; cls?: number; tbt?: number; speedIndex?: number; tti?: number };
        fieldData?: { lcpPercentile?: number; clsPercentile?: number; fidPercentile?: number; overallCategory?: string };
        crawlability?: { robotsTxt?: boolean; documentTitle?: boolean; metaDescription?: boolean; canonical?: boolean; crawlableAnchors?: boolean };
        security?: { httpStatus?: number; https?: boolean };
        diagnostics?: Record<string, any>;
    };
    keywords: Array<{
        keyword: string;
        frequency: number;
        inTitle?: boolean;
        inH1?: boolean;
        inMeta?: boolean;
        firstPosition?: number;
    }>;
    aiSummary?: string;
    lastEvaluatedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export const DomainNode = mongoose.model<IDomainNode>("DomainNode", domainNodeSchema);