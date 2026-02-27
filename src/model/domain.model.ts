import mongoose, { Schema, Document } from "mongoose";
const SitemapUrlSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    lastModified: {
        type: Date,
        required: true,
    },
    xmlHash: {
        type: String,
        required: true,
    },
    sitemapSeoResult: {
        score: Number,
        totalPages: Number,
        totalIssues: Number,
        issues: { type: Array, default: [] }
    }
});
const DomainSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        domainSitemap: {
            type: [SitemapUrlSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);
export const Domain = mongoose.model("Domain", DomainSchema);