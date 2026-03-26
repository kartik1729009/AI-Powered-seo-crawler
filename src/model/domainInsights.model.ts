import mongoose, { Schema, Document, Types, Model } from "mongoose";

interface IPerCheckScoreDiff {
    seoCheck: Types.ObjectId;
    scoreDifference: number;
}

const PerCheckScoreDiffSchema = new Schema<IPerCheckScoreDiff>({
    seoCheck: { type: Schema.Types.ObjectId, ref: "SeoCheck", required: true },
    scoreDifference: { type: Number, required: true },
}, { _id: false });

interface ISeoDifference {
    overallScore?: number; 
    perCheckSeoScores: IPerCheckScoreDiff[];
}

const SeoDifferenceSchema = new Schema<ISeoDifference>({
    overallScore: { type: Number },
    perCheckSeoScores: { type: [PerCheckScoreDiffSchema], default: [] },
}, { _id: false });

interface ITechnicalSeoDifference {
    meta?: Record<string, any>;
    scores?: {
        performance?: number;
        seo?: number;
        accessibility?: number;
        bestPractices?: number;
    };
    coreWebVitals?: {
        lcp?: number;
        fcp?: number;
        cls?: number;
        tbt?: number;
        speedIndex?: number;
        tti?: number;
    };
    fieldData?: {
        lcpPercentile?: number;
        clsPercentile?: number;
        fidPercentile?: number;
        overallCategory?: string;
    };
    crawlability?: Record<string, any>;
    security?: Record<string, any>;
    structuredData?: boolean;
    diagnostics?: Record<string, any>;
}

const TechnicalSeoDifferenceSchema = new Schema<ITechnicalSeoDifference>({
    meta: { type: Schema.Types.Mixed, default: {} },
    scores: { type: Schema.Types.Mixed, default: {} },
    coreWebVitals: { type: Schema.Types.Mixed, default: {} },
    fieldData: { type: Schema.Types.Mixed, default: {} },
    crawlability: { type: Schema.Types.Mixed, default: {} },
    security: { type: Schema.Types.Mixed, default: {} },
    structuredData: { type: Boolean },
    diagnostics: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

export interface IDomainNodeInsights extends Document {
    domain: Types.ObjectId;
    domainNode: Types.ObjectId;     
    comparedWith: Types.ObjectId;     
    lastCalculatedAt: Date;

    bestPage?: Types.ObjectId;
    worstPage?: Types.ObjectId;

    seoDifference: ISeoDifference;
    technicalSeoDifference: ITechnicalSeoDifference;

    notes?: string;
}

const DomainNodeInsightsSchema = new Schema<IDomainNodeInsights>({
    domain: { type: Schema.Types.ObjectId, ref: "Domain", required: true },
    domainNode: { type: Schema.Types.ObjectId, ref: "DomainNode", required: true },
    comparedWith: { type: Schema.Types.ObjectId, ref: "DomainNode", required: true }, 
    lastCalculatedAt: { type: Date, default: Date.now },

    bestPage: { type: Schema.Types.ObjectId, ref: "DomainPage" },
    worstPage: { type: Schema.Types.ObjectId, ref: "DomainPage" },

    seoDifference: { type: SeoDifferenceSchema, required: true },
    technicalSeoDifference: { type: TechnicalSeoDifferenceSchema, required: true },

    notes: { type: String },
}, { timestamps: true });

export const DomainNodeInsights: Model<IDomainNodeInsights> = mongoose.model<IDomainNodeInsights>(
    "DomainNodeInsights",
    DomainNodeInsightsSchema
);