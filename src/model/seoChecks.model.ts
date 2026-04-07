import mongoose from "mongoose";

const ThresholdSchema = new mongoose.Schema(
    {
        min: { type: Number },
        max: { type: Number },
        ideal: { type: Number }
    },
    { _id: false }
);

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

        // ✅ FIXED: Proper schema instead of Mixed
        thresholds: {
            type: ThresholdSchema,
            default: () => ({})
        },

        source: {
            type: String,
            enum: [
                "html",
                "title",
                "meta_description",
                "body",
                "headings",
                "images",
                "internal_links",
                "external_links",
                "anchors"
            ],
            default: "html"
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
        },

        checkType: {
            type: String,
            enum: [
                "exists",
                "length_range",
                "count",
                "keyword_in_text",
                "keyword_in_first_n_words",
                "structure",
                "percentage_match",
                "custom"
            ],
            default: "exists"
        },

        operation: {
            type: String,
            enum: [
                "includes",
                "equals",
                "greater_than",
                "less_than",
                "range",
                "regex",
                "custom"
            ],
            default: "includes"
        },

        // ✅ Keep flexible (important for your engine)
        config: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        dependsOn: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "SeoCheck"
            }
        ],

        applicability: {
            type: String,
            enum: ["page", "site", "both"],
            default: "page"
        },

        scope: {
            type: String,
            enum: ["page", "site"],
            default: "page"
        }
    },
    {
        timestamps: true,
        strict: "throw"
    }
);
SeoCheckSchema.index({ key: 1 });
SeoCheckSchema.index({ isActive: 1, category: 1 });
SeoCheckSchema.index({ applicability: 1, scope: 1 });

export const SeoCheck = mongoose.model("SeoCheck", SeoCheckSchema);