import { XMLParser } from "fast-xml-parser";

export type Essay = {
  title: string;
  slug: string;
  url: string;
  pubDate: string;
  contentHtml?: string;
  excerpt?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function slugFromUrl(url: string) {
  const match = url.match(/\/p\/([^/?#]+)/);
  return match?.[1] ?? url;
}

export async function fetchSubstackEssays(feedUrl: string): Promise<Essay[]> {
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`Failed to fetch RSS: ${res.status} ${res.statusText}`);
  const xml = await res.text();

  const data = parser.parse(xml);
  const items = data?.rss?.channel?.item ?? [];
  const array = Array.isArray(items) ? items : [items];

  return array.map((item: any) => {
    const url = item.link as string;
    const slug = slugFromUrl(url);

    const content =
      item["content:encoded"] ??
      item["content"] ??
      item["description"] ??
      "";

    const excerpt =
      typeof item.description === "string"
        ? item.description.replace(/<[^>]+>/g, "").trim().slice(0, 240)
        : undefined;

    return {
      title: item.title as string,
      slug,
      url,
      pubDate: item.pubDate as string,
      contentHtml: typeof content === "string" ? content : undefined,
      excerpt,
    };
  });
}
