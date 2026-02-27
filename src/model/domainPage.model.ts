import mongoose, { Schema, Document } from "mongoose";
import { ref } from "node:process";
import { versioningPlugin } from "../utils/versioning";
const keywordsSchema = new Schema(
    {
        keyword: {
            type: String,
            required: true,
            index: true
        },
        frequency: {
            type: Number,
            required: true
        },
        inTitle: {
            type: Boolean,
            default: false
        },
        inH1: {
            type: Boolean,
            default: false
        },
        inMeta: {
            type: Boolean,
            default: false
        },
        firstPosition: {
            type: Number
        }
    },
    { _id: false }
)
const links = new Schema(
    {
        url: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            enum: ["Head", "Body", "Title", "Footer"],
            required: true,
        },
        count: {
            type: Number,
            default: 1,
        }
    }
)
const pageLinksSchema = new Schema(
    {
        internalLinks: {
            type: [links],
            default: []
        },
        externalLinks: {
            type: [links],
            default: []
        }
    }
)
const perCheckSeoScoreSchema = new Schema(
    {
        seoCheck: {
            type: Schema.Types.ObjectId,
            ref: "SeoCheck",
            required: true,
        },
        score: {
            type: Number,
            required: true,
        }
    },
    { _id: false }
)
const coreWebVitalsSchema = new Schema(
    {
        lcp: { type: Number },   
        fcp: { type: Number },   
        cls: { type: Number },   
        tbt: { type: Number },   
        speedIndex: { type: Number },
        tti: { type: Number },   
    },
    { _id: false }
);

const fieldDataSchema = new Schema(
    {
        lcpPercentile: { type: Number },
        clsPercentile: { type: Number },
        fidPercentile: { type: Number },
        overallCategory: { type: String }, 
    },
    { _id: false }
);

const categoryScoresSchema = new Schema(
    {
        performance: { type: Number },
        seo: { type: Number },
        accessibility: { type: Number },
        bestPractices: { type: Number },
    },
    { _id: false }
);

const crawlabilitySchema = new Schema(
    {
        robotsTxt: { type: Boolean },
        documentTitle: { type: Boolean },
        metaDescription: { type: Boolean },
        canonical: { type: Boolean },
        crawlableAnchors: { type: Boolean },
    },
    { _id: false }
);

const securitySchema = new Schema(
    {
        httpStatus: { type: Number },
        https: { type: Boolean },
    },
    { _id: false }
);

const diagnosticsSchema = new Schema(
    {
        serverResponseTime: { type: Number },
        domSize: { type: Number },
        totalByteWeight: { type: Number },

        renderBlockingResources: { type: Schema.Types.Mixed },
        unusedCss: { type: Schema.Types.Mixed },
        unusedJavascript: { type: Schema.Types.Mixed },
        networkRequests: { type: Schema.Types.Mixed },
        thirdPartySummary: { type: Schema.Types.Mixed },
    },
    { _id: false }
);

const pageMetaSchema = new Schema(
    {
        finalUrl: { type: String },
        fetchTime: { type: Date },
        strategy: { type: String }, 
    },
    { _id: false }
);

const technicalSeoSchema = new Schema(
    {

        meta: pageMetaSchema,

        scores: categoryScoresSchema,

        coreWebVitals: coreWebVitalsSchema,

        fieldData: fieldDataSchema,

        crawlability: crawlabilitySchema,

        security: securitySchema,

        structuredData: {
            type: Boolean,
        },

        diagnostics: diagnosticsSchema,
    },
    { _id: false }
);
const domainPageSchema = new mongoose.Schema(
    {
        domain: {
            ref: "Domain",
            type: Schema.Types.ObjectId,
            required: true
        },
        domainPageUrl: {
            type: String,
            required: true,
        },
        domainPageHtmlHash: {
            type: String,
            required: true,
        },
        perCheckSeoScore: {
            type: [perCheckSeoScoreSchema],
            default: []
        },
        pageLinks: {
            type: pageLinksSchema,
            default: {}
        },
        pageDepth: {
            type: Number,
        },
        seoScore: {
            type: Number,
        },
        technicalSeo: {
            type: technicalSeoSchema,
            default: () => ({})
        },
        overallScore: {
            type: Number,
        },
        keywords: {
            type: [keywordsSchema],
            default: []
        },
        isActive: {
            type: Boolean,
            default: true
        },
        aiSummary: {
            type: String
        },
    },
    { timestamps: true }
)
domainPageSchema.plugin(versioningPlugin, {
    fields: ["seoScore", "overallScore", "domainPageHtmlHash"]
})
export const DomainPage = mongoose.model(
    "DomainPage",
    domainPageSchema
);