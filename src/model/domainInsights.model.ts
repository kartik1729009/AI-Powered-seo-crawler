import mongoose, { Schema, Types } from "mongoose";
const seoImprovementOpportunitySchema = new Schema(
    {
        seoScoreDifference: {
            type: Number,
            required: true,
        },
        potentialOverallGain: {
            type: Number, 
        },
    },
    { _id: false }
);
const technicalSeoImprovementOpportunitySchema = new Schema(
    {
        performanceDifference: { type: Number },
        accessibilityDifference: { type: Number },
        bestPracticesDifference: { type: Number },
        seoDifference: { type: Number },
        lcpDifference: { type: Number },
        fcpDifference: { type: Number },
        clsDifference: { type: Number },
        tbtDifference: { type: Number },
        speedIndexDifference: { type: Number },
        ttiDifference: { type: Number },
    },
    { _id: false }
);
const improvementOpportunitiesSchema = new Schema(
    {
        seo: {
            type: seoImprovementOpportunitySchema,
            required: true,
        },

        technicalSeo: {
            type: technicalSeoImprovementOpportunitySchema,
            default: () => ({}),
        },
    },
    { _id: false }
);
const insightsSchema = new Schema(
    {
        bestPage: {
            type: Types.ObjectId,
            ref: "DomainPage",
            required: true,
        },
        worstPage: {
            type: Types.ObjectId,
            ref: "DomainPage",
            required: true,
        },
        comparedWith: {
            type: Types.ObjectId,
            ref: "DomainNode", 
            required: true,
        },

        improvementOpportunities: {
            type: improvementOpportunitiesSchema,
            required: true,
        },

        lastCalculatedAt: {
            type: Date,
            required: true,
        },
    },
    { _id: false }
);
const domainNodeInsightsSchema = new Schema(
    {
        domain: {
            type: Types.ObjectId,
            ref:"Domain",
            required: true
        },
        domainNode: {
            type: Types.ObjectId,
            ref: "DomainNode",
            required: true,
            unique: true,
        },

        insights: {
            type: insightsSchema,
            required: true,
        },
    },
    { timestamps: true }
);
domainNodeInsightsSchema.index({
    "insights.improvementOpportunities.seo.seoScoreDifference": -1,
});
export const DomainNodeInsights = mongoose.model(
    "DomainNodeInsights",
    domainNodeInsightsSchema
);