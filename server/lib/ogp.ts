import { prisma } from "../db";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/**
 * Link-preview tags (LINE / X / Slack…) for a public trip page, replacing the default block
 * between <!--ogp--> and <!--/ogp--> in index.html. Crawlers don't run JS, so this has to be
 * server-rendered. Returns null for anything that isn't a published trip.
 */
export async function tripMetaTags(tripId: string, origin: string): Promise<string | null> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, status: "PUBLISHED" },
    select: {
      title: true,
      summary: true,
      journalText: true,
      heroUrl: true,
      author: { select: { displayName: true } },
      spots: { select: { photos: { select: { url: true }, take: 1 } }, orderBy: { createdAt: "asc" }, take: 5 },
    },
  });
  if (!trip) return null;

  let title = trip.title;
  let description = "";
  try {
    const j = trip.journalText ? JSON.parse(trip.journalText) : null;
    if (j?.title) title = j.title;
    description = (j?.sections ?? [])
      .flatMap((s: any) => s.entries ?? [])
      .map((e: any) => e.text)
      .filter(Boolean)
      .join(" ");
  } catch {
    // not a journal: fall back below
  }
  if (!description) description = trip.summary && !trip.summary.startsWith("{") ? trip.summary : "";
  const by = trip.author?.displayName ? `${trip.author.displayName}さんの旅行記` : "旅行記";
  description = clip(description || `${by} — GlobeHubで撮って、ひとこと話すだけでつくれるAI旅行記`, 120);

  const raw = trip.heroUrl || trip.spots.find((s) => s.photos[0])?.photos[0]?.url;
  const image = raw ? (raw.startsWith("http") ? raw : origin + raw) : null;
  const url = `${origin}/trips/${tripId}`;
  const fullTitle = `${clip(title, 60)} | ${by} | GlobeHub`;

  return [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:site_name" content="GlobeHub" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${esc(clip(title, 60))}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    ...(image ? [`<meta property="og:image" content="${esc(image)}" />`] : []),
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
  ].join("\n    ");
}

export function injectMeta(html: string, tags: string) {
  return html.replace(/<!--ogp-->[\s\S]*?<!--\/ogp-->/, tags);
}
