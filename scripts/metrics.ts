/**
 * Funnel report for the last N days (default 7): visits → signups → trips → records → journals → shares.
 * Usage: npx tsx scripts/metrics.ts [days]
 * Test accounts (smoketest+…@globehub.test) are excluded.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const days = Number(process.argv[2] ?? 7);
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function main() {
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: "smoketest+", endsWith: "@globehub.test" } },
    select: { id: true },
  });
  const excluded = testUsers.map((u) => u.id);
  const notTest = { notIn: excluded };

  const events = await prisma.event.findMany({
    where: { createdAt: { gte: since }, OR: [{ userId: null }, { userId: notTest }] },
    select: { name: true, userId: true, props: true },
  });
  const byName = (n: string) => events.filter((e) => e.name === n);
  const distinct = (list: { userId: string | null }[]) => new Set(list.map((e) => e.userId)).size;

  const visits = byName("visit");
  const sources = new Map<string, Set<string | null>>();
  for (const v of visits) {
    const p = (v.props ?? {}) as Record<string, string>;
    const key = p.utm_source ? `${p.utm_source}${p.utm_campaign ? ` / ${p.utm_campaign}` : ""}` : p.referrer ? `ref: ${p.referrer}` : "direct";
    if (!sources.has(key)) sources.set(key, new Set());
    sources.get(key)!.add(v.userId);
  }

  const signups = byName("signup");
  const signupIds = new Set(signups.map((s) => s.userId));
  const signupSources = new Map<string, number>();
  for (const v of visits) {
    if (!signupIds.has(v.userId)) continue;
    const p = (v.props ?? {}) as Record<string, string>;
    const key = p.utm_source ?? (p.referrer ? `ref: ${p.referrer}` : "direct");
    signupSources.set(key, (signupSources.get(key) ?? 0) + 1);
  }

  const trips = await prisma.trip.findMany({
    where: { createdAt: { gte: since }, authorId: notTest },
    select: { id: true, authorId: true, journalGeneratedAt: true, isPublic: true, publishedAt: true },
  });
  const records = await prisma.spot.count({
    where: {
      createdAt: { gte: since },
      trip: { authorId: notTest },
      OR: [{ photos: { some: {} } }, { impressionRemarks: { not: null } }],
    },
  });
  const journals = await prisma.trip.count({ where: { journalGeneratedAt: { gte: since }, authorId: notTest } });
  const published = await prisma.trip.count({ where: { publishedAt: { gte: since }, isPublic: true, authorId: notTest } });

  // Views of shared journals by someone other than the author
  const views = byName("journal_view");
  const viewTripIds = [...new Set(views.map((v) => (v.props as any)?.tripId).filter(Boolean))] as string[];
  const authors = new Map(
    (await prisma.trip.findMany({ where: { id: { in: viewTripIds } }, select: { id: true, authorId: true } })).map((t) => [t.id, t.authorId]),
  );
  const otherViews = views.filter((v) => authors.get((v.props as any)?.tripId) !== v.userId);

  const line = (label: string, value: number | string) => console.log(`${label.padEnd(14, "　")} ${value}`);
  console.log(`\nGlobeHub 利用状況（直近${days}日: ${since.toISOString().slice(0, 10)} 〜）\n`);
  line("訪問ユーザー", distinct(visits));
  line("新規登録", signups.length);
  line("旅の開始", trips.length);
  line("旅を始めた人", new Set(trips.map((t) => t.authorId)).size);
  line("記録（写真かひとことあり）", records);
  line("旅行記の生成", journals);
  line("旅行記の公開", published);
  line("共有ボタン", byName("share").length);
  line("他人による旅行記の閲覧", otherViews.length);
  line("閲覧ページのCTAクリック", byName("cta_click").length);

  console.log("\n流入元（訪問ユーザー数）");
  for (const [k, s] of [...sources].sort((a, b) => b[1].size - a[1].size)) console.log(`  ${k}: ${s.size}`);
  if (signupSources.size) {
    console.log("\n登録者の流入元");
    for (const [k, n] of [...signupSources].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`);
  }
}

main().finally(() => prisma.$disconnect());
