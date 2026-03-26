import { GoogleAdsApi } from "google-ads-api";
import dotenv from "dotenv";

dotenv.config();
console.log(process.env.CUSTOMER_ID)
const client = new GoogleAdsApi({
    client_id: process.env.CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
    developer_token: process.env.DEVELOPER_TOKEN!,
});

const customer = client.Customer({
    customer_id: process.env.CUSTOMER_ID!,
    refresh_token: process.env.REFRESH_TOKEN!,
});

export interface KeywordVolumeResult {
    keyword: string;
    avg_monthly_searches: number;
    competition: string;
    competition_index: number;
    low_top_of_page_bid: number;
    high_top_of_page_bid: number;
}

export const getKeywordSearchVolume = async (
    keywords: string[],
    geoTarget: string = "geoTargetConstants/2840",
    language: string = "languageConstants/1000"
): Promise<KeywordVolumeResult[]> => {

    const response = await customer.keywordPlanIdeas.generateKeywordIdeas(
        {
            customer_id: process.env.CUSTOMER_ID!.replace(/-/g, ""), // 👈 IMPORTANT
            keyword_seed: { keywords },
            geo_target_constants: [geoTarget],
            language,
            include_adult_keywords: false,
        } as any
    );

    const results = response.results ?? [];

    return results.map((idea: any) => ({
        keyword: idea.text,
        avg_monthly_searches:
            idea.keyword_idea_metrics?.avg_monthly_searches ?? 0,
        competition:
            idea.keyword_idea_metrics?.competition ?? "UNSPECIFIED",
        competition_index:
            idea.keyword_idea_metrics?.competition_index ?? 0,
        low_top_of_page_bid:
            idea.keyword_idea_metrics?.low_top_of_page_bid_micros
                ? idea.keyword_idea_metrics.low_top_of_page_bid_micros / 1_000_000
                : 0,
        high_top_of_page_bid:
            idea.keyword_idea_metrics?.high_top_of_page_bid_micros
                ? idea.keyword_idea_metrics.high_top_of_page_bid_micros / 1_000_000
                : 0,
    }));
};

(async () => {
    try {
        const data = await getKeywordSearchVolume([
            "seo tools",
            "keyword research"
        ]);
        console.log(JSON.stringify(data, null, 2));
    } catch (err: any) {
        console.error("FULL ERROR:");
        console.error(err);
        console.error("Response:");
        console.error(err?.response?.errors);
    }
})();