import { Schema } from "mongoose";

interface VersioningOptions {
    fields: string[];
}
export const versioningPlugin = (
    schema: Schema,
    options: VersioningOptions
) => {
    const { fields } = options;

    schema.add({
        currentVersion: {
            type: Number,
            default: 1,
        },
        versions: [
            {
                version: { type: Number, required: true },
                data: { type: Schema.Types.Mixed, required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],
    });
    schema.pre("save", function () {
        const doc = this as any;
        doc.versions = doc.versions ?? [];
        if (doc.isNew) {
            doc.currentVersion = 1;
            doc.versions.push({
                version: 1,
                data: pickFields(doc, fields),
                createdAt: new Date(),
            });
            return;
        }
        const hasVersionedChange = fields.some((field) =>
            doc.isModified(field)
        );

        if (!hasVersionedChange) {
            return;
        }

        const newVersion = doc.currentVersion + 1;

        doc.versions.push({
            version: newVersion,
            data: pickFields(doc, fields),
            createdAt: new Date(),
        });

        doc.currentVersion = newVersion;
    });
};

const pickFields = (doc: any, fields: string[]) => {
    const data: Record<string, unknown> = {};
    for (const field of fields) {
        data[field] = doc.get(field);
    }
    return data;
};