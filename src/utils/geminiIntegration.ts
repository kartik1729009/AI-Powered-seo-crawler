import dotenv from "dotenv"
dotenv.config();
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

export async function generateSeoReport(allScores: any) {
    const prompt = `
        You are an expert senior SEO analyst.

        You are analyzing a single domain page based on structured SEO evaluation data.

        Your task is to:

        1. Identify what is wrong or weak in this domain page based on the provided scores.
        2. Clearly explain why those weaknesses matter.
        3. Provide actionable improvements.
        4. Separate improvements into:
        - SEO Score improvements (content, headings, meta, keyword usage, structure, etc.)
        - Technical SEO improvements (performance, indexing, crawlability, schema, etc.)

        Be analytical and precise.
        Do NOT hallucinate missing data.
        Base your reasoning strictly on the provided input.

        INPUT DATA:
        ${JSON.stringify(allScores, null, 2)}

        OUTPUT FORMAT (STRICTLY FOLLOW THIS FORMAT):

        what is wrong with the domainPage
        -----
        <Clear explanation of weaknesses and lagging areas based on scores>

        improvement:
        seoScoreImprovement:
        - <bullet points with clear actionable suggestions>
        - <prioritized improvements>
        - <mention how it improves score>

        technicalSeoImprovement:
        - <bullet points with technical fixes>
        - <performance / indexing / crawl improvements>
        - <mention how it improves score>

        Rules:
        - Do NOT add any extra sections.
        - Do NOT repeat the input.
        - Do NOT include generic SEO advice.
        - Only give insights relevant to the provided data.
        - Keep it concise but powerful.
        `;
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
    });
    return response.text
}