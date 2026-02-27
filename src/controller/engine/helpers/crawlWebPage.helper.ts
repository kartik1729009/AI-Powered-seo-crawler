import axios from "axios";
import * as loggers from "../../../utils/loggers";
import crypto from "crypto";
import { dbUpdate } from "../../../utils/dbUtils";
import { DomainPage } from "../../../model/domainPage.model";
import { SystemError } from "../../../error/systemError";
import { ErrorContext, ErrorSeverity } from "../../../error/error.types";
import { infoQueue } from "../queues";
import * as cheerio from "cheerio"
import natural, { Tokenizer } from "natural"
import { removeStopwords } from "stopword"
async function extractKeywords(html: string) {
    const $ = cheerio.load(html);
    $('script, style, noscript, svg').remove();
    $('div, p, span, li, a, h1, h2, h3, h4, h5, h6, td').each((_, el) => {
        $(el).append(' ');
    });
    const titleText = $("title").text().toLowerCase();
    const metaText = $('meta[name="description"]').attr("content")?.toLowerCase() || "";
    const rawBodyText = $("body").text();
    const cleanedBodyText = rawBodyText
        .replace(/([a-z])([A-Z])/g, '$1 $2') 
        .replace(/[^a-zA-Z\s]/g, ' ')         
        .toLowerCase()
        .replace(/\s+/g, " ")                
        .trim();
    const tokenizer = new natural.WordTokenizer();
    let words = tokenizer.tokenize(cleanedBodyText) || [];
    words = removeStopwords(words);

    const frequencyMap: Record<string, number> = {};
    const firstPositionMap: Record<string, number> = {};

    words.forEach((word, index) => {
        if (word.length < 3) return;

        if (!frequencyMap[word]) {
            frequencyMap[word] = 1;
            firstPositionMap[word] = index;
        } else {
            frequencyMap[word]++;
        }
    });
    const keywords = Object.keys(frequencyMap).map((word) => ({
        keyword: word,
        frequency: frequencyMap[word],
        inTitle: titleText.includes(word),
        inH1: false, 
        inMeta: metaText.includes(word),
        firstPosition: firstPositionMap[word],
    }));
    return keywords.sort((a, b) => b.frequency - a.frequency);
}
export async function crawlWebPage(url: string, domainId: string) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 10000
        });
        const html = response.data
        if (response.status !== 200) {
            throw new Error(`Failed with status code: ${response.status}`);
        }
        const keywords = await extractKeywords(html);
        const hash = crypto
            .createHash("sha256")
            .update(html)
            .digest("hex");
        const page = await dbUpdate(
            DomainPage,
            {
                domain: domainId,
                domainPageUrl: url,
                domainPageHtmlHash: hash,
                keywords: keywords
            },
            { domain: domainId, domainPageUrl: url },
            { upsert: true }
        );
        await infoQueue.add("page", {
            domainId,
            url,
            html,
            pageId: page?._id
        });
        loggers.helperLogger.info("crawlWebPage helper: successful", {
            url,
            domainId
        });
    } catch (err: any) {
        loggers.helperLogger.error("crawlWebPage helper: failed", {
            error: err.message,
            url,
            domainId
        });
        throw new SystemError({
            message: "Failed to crawl or persist webpage",
            context: ErrorContext.DATABASE,
            source: "HELPER",
            severity: ErrorSeverity.HIGH,
            metadata: {
                operation: "WebPageCrawl",
                originalError: err.message,
                url,
                domainId
            }
        });
    }
}
