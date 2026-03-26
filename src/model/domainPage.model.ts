import mongoose, { Schema, Document, Types, Model } from "mongoose";
import { versioningPlugin } from "../utils/versioning";
const stageStatusEnum = ["pending", "inProgress", "completed", "failed"] as const;
const stageSchema = new Schema(
    {
        status: { type: String, enum: stageStatusEnum, default: "pending" },
        startedAt: Date,
        completedAt: Date,
        error: String,
    },
    { _id: false }
);
const processingSchema = new Schema(
    {
        pageQueue: { type: stageSchema, default: () => ({}) },
        infoQueue: { type: stageSchema, default: () => ({}) },
        technicalQueue: { type: stageSchema, default: () => ({}) },
        pageSeoQueue: { type: stageSchema, default: () => ({}) },
        siteSeoQueue: { type: stageSchema, default: () => ({}) },

        overallStatus: { type: String, enum: ["queued", "processing", "completed", "failed"], default: "queued" },
        progress: { type: Number, default: 0 },
    },
    { _id: false }
);
const keywordsSchema = new Schema(
    {
        keyword: { type: String, required: true, index: true },
        frequency: { type: Number, required: true },
        inTitle: { type: Boolean, default: false },
        inH1: { type: Boolean, default: false },
        inMeta: { type: Boolean, default: false },
        firstPosition: { type: Number },
    },
    { _id: false }
);

const links = new Schema(
    {
        url: { type: String, required: true },
        location: { type: String, enum: ["Head", "Body", "Title", "Footer"], required: true },
        count: { type: Number, default: 1 },
    }
);

const pageLinksSchema = new Schema(
    {
        internalLinks: { type: [links], default: [] },
        externalLinks: { type: [links], default: [] },
    },
    { _id: false }
);
export interface IPerCheckSeoScore {
    seoCheck?: Types.ObjectId | null;
    score?: number | null;
    _id?: never; // important for _id: false
}

const perCheckSeoScoreSchema = new Schema<IPerCheckSeoScore>(
    {
        seoCheck: { type: Schema.Types.ObjectId, ref: "SeoCheck" },
        score: { type: Number },
    },
    { _id: false }
);
const coreWebVitalsSchema = new Schema(
    { lcp: Number, fcp: Number, cls: Number, tbt: Number, speedIndex: Number, tti: Number },
    { _id: false }
);

const fieldDataSchema = new Schema(
    { lcpPercentile: Number, clsPercentile: Number, fidPercentile: Number, overallCategory: String },
    { _id: false }
);

const categoryScoresSchema = new Schema(
    { performance: Number, seo: Number, accessibility: Number, bestPractices: Number },
    { _id: false }
);

const crawlabilitySchema = new Schema(
    { robotsTxt: Boolean, documentTitle: Boolean, metaDescription: Boolean, canonical: Boolean, crawlableAnchors: Boolean },
    { _id: false }
);

const securitySchema = new Schema(
    { httpStatus: Number, https: Boolean },
    { _id: false }
);

const diagnosticsSchema = new Schema(
    {
        serverResponseTime: Number,
        domSize: Number,
        totalByteWeight: Number,
        renderBlockingResources: Schema.Types.Mixed,
        unusedCss: Schema.Types.Mixed,
        unusedJavascript: Schema.Types.Mixed,
        networkRequests: Schema.Types.Mixed,
        thirdPartySummary: Schema.Types.Mixed,
    },
    { _id: false }
);

const pageMetaSchema = new Schema({ finalUrl: String, fetchTime: Date, strategy: String }, { _id: false });

const technicalSeoSchema = new Schema(
    {
        meta: pageMetaSchema,
        scores: categoryScoresSchema,
        coreWebVitals: coreWebVitalsSchema,
        fieldData: fieldDataSchema,
        crawlability: crawlabilitySchema,
        security: securitySchema,
        structuredData: Boolean,
        diagnostics: diagnosticsSchema,
    },
    { _id: false }
);
export interface IDomainPage extends Document {
    domain: Types.ObjectId;
    domainPageUrl: string;
    domainPageHtmlHash: string;
    perCheckSeoScore: IPerCheckSeoScore[];
    pageLinks: {
        internalLinks: { url: string; location: string; count: number }[];
        externalLinks: { url: string; location: string; count: number }[];
    };
    pageDepth?: number;
    seoScore?: number;
    technicalSeo: {
        meta?: { finalUrl?: string; fetchTime?: Date; strategy?: string };
        scores?: { performance?: number; seo?: number; accessibility?: number; bestPractices?: number };
        coreWebVitals?: { lcp?: number; fcp?: number; cls?: number; tbt?: number; speedIndex?: number; tti?: number };
        fieldData?: { lcpPercentile?: number; clsPercentile?: number; fidPercentile?: number; overallCategory?: string };
        crawlability?: { robotsTxt?: boolean; documentTitle?: boolean; metaDescription?: boolean; canonical?: boolean; crawlableAnchors?: boolean };
        security?: { httpStatus?: number; https?: boolean };
        structuredData?: boolean;
        diagnostics?: Record<string, any>;
    };
    overallScore?: number;
    keywords: Array<{ keyword: string; frequency: number; inTitle?: boolean; inH1?: boolean; inMeta?: boolean; firstPosition?: number }>;
    isActive: boolean;
    aiSummary?: string;
    processing: {
        pageQueue: { status: string; startedAt?: Date; completedAt?: Date; error?: string };
        infoQueue: { status: string; startedAt?: Date; completedAt?: Date; error?: string };
        technicalQueue: { status: string; startedAt?: Date; completedAt?: Date; error?: string };
        pageSeoQueue: { status: string; startedAt?: Date; completedAt?: Date; error?: string };
        siteSeoQueue: { status: string; startedAt?: Date; completedAt?: Date; error?: string };
        overallStatus: string;
        progress: number;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
const domainPageSchema = new mongoose.Schema<IDomainPage>(
    {
        domain: { ref: "Domain", type: Schema.Types.ObjectId, required: true },
        domainPageUrl: { type: String, required: true },
        domainPageHtmlHash: { type: String, required: true },
        perCheckSeoScore: { type: [perCheckSeoScoreSchema], default: [] },
        pageLinks: { type: pageLinksSchema, default: {} },
        pageDepth: Number,
        seoScore: Number,
        technicalSeo: { type: technicalSeoSchema, default: () => ({}) },
        overallScore: Number,
        keywords: { type: [keywordsSchema], default: [] },
        isActive: { type: Boolean, default: true },
        aiSummary: String,
        processing: { type: processingSchema, default: () => ({}) },
    },
    { timestamps: true }
);
domainPageSchema.plugin(versioningPlugin, { fields: ["seoScore", "overallScore", "domainPageHtmlHash"] });
export const DomainPage: Model<IDomainPage> = mongoose.model<IDomainPage>("DomainPage", domainPageSchema);