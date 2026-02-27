import mongoose from "mongoose";

const SeoCheckSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            enum: [
                "title_meta",
                "heading_structure",
                "content_quality",
                "url_structure",
                "image_optimization",
                "internal_linking",
                "user_experience"
            ],
        },
        subCategory: {
            type: String,
            trim: true,
        },
        weight: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        thresholds: {
            min: { type: Number },
            max: { type: Number }
        },
        selector: {
            type: String,
            trim: true
        },
        attribute: {
            type: String,
            trim: true
        },
        scoringType: {
            type: String,
            enum: ["binary", "range", "percentage"],
            default: "binary",
        },
        maxScore: {
            type: Number,
            default: 1,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        version: {
            type: Number,
            default: 1,
        },
        tags: [
            {
                type: String,
                trim: true,
            }
        ],
        order: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
    }
);
export const SeoCheck = mongoose.model("SeoCheck", SeoCheckSchema);
