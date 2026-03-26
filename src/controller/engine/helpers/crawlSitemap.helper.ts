import { Cheerio } from "cheerio";
import {XMLParser} from "fast-xml-parser"
import axios from "axios";
import { crawlWebPage } from "./crawlWebPage.helper";

export async function crawlSitemap(url: string, domainId: string) {
    const { data } = await axios.get(url);
    const parser = new XMLParser();
    const json = parser.parse(data);
    const urls = json.urlset.url.map((entry: any) => entry.loc);
    console.log("extracted urls:");
    console.log(urls);
    for (const pageUrl of urls) {
        await crawlWebPage(pageUrl, domainId);
    }
}