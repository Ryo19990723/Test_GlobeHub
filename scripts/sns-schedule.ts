// Schedule SNS posts from a Marketing posts.md into Buffer (GraphQL API).
//   npx tsx --env-file=.env scripts/sns-schedule.ts <posts.md> [--dry] [--channels] [--introspect] [--only=p1,t1] [--skip=p1]
// posts.md format: "## 11/9（月）" day headers, "### Instagram — p1…" / "### Threads — t1" followed by a ``` caption block,
// and an optional "画像: a.jpg, b.jpg" line. Instagram posts use every images/<id>-N.jpg as a carousel.
// Images are served from the app at /sns/<folder>/ (client/public/sns), since Buffer only accepts public URLs.
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const ENDPOINT = "https://api.buffer.com";
const SITE = "https://test-globehub.onrender.com";
const TIMES = { instagram: "20:00", threads: "12:30" } as const;
type Service = keyof typeof TIMES;

async function gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("BUFFER_API_KEY is not set");
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors ?? j).slice(0, 800));
  return j.data;
}

const assets = process.argv.find((a) => a.startsWith("--assets="))?.split("=")[1]; // served folder, when images were replaced
type Post = { id: string; service: Service; dueAt: string; text: string; images: string[] };

function parse(file: string): Post[] {
  const md = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const folder = basename(dirname(file));
  const imgDir = join(dirname(file), "images");
  const year = Number(folder.slice(0, 4));
  const posts: Post[] = [];
  let day = "";
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const d = lines[i].match(/^## (\d+)\/(\d+)/);
    if (d) { day = `${year}-${d[1].padStart(2, "0")}-${d[2].padStart(2, "0")}`; continue; }
    const h = lines[i].match(/^### (Instagram|Threads) — (\w+)/);
    if (!h || !day) continue;
    const service = h[1].toLowerCase() as Service;
    const id = h[2];
    const start = lines.indexOf("```", i + 1);
    const end = lines.indexOf("```", start + 1);
    const text = lines.slice(start + 1, end).join("\n").trim();
    const imgLine = lines[end + 1]?.match(/^画像: (.+)/)?.[1];
    const files = service === "instagram"
      ? readdirSync(imgDir).filter((f) => f.startsWith(`${id}-`) && f.endsWith(".jpg")).sort()
      : (imgLine?.split(/,\s*/) ?? []);
    posts.push({
      id, service, text,
      dueAt: new Date(`${day}T${TIMES[service]}:00+09:00`).toISOString(),
      images: files.map((f) => `${SITE}/sns/${assets ?? folder}/${f}`),
    });
    i = end;
  }
  return posts;
}

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));

if (args.includes("--introspect")) {
  for (const name of ["SchedulingType", "ShareMode", "PostType", "Service"]) {
    const d = await gql(`query($n:String!){ __type(name:$n){ enumValues { name } } }`, { n: name });
    console.log(name, d.__type?.enumValues?.map((v: any) => v.name));
  }
  process.exit(0);
}

if (args.includes("--dry")) {
  if (!file) throw new Error("usage: sns-schedule.ts <posts.md> --dry");
  for (const p of parse(file)) console.log(p.id, p.service, p.dueAt, p.images.map((u) => basename(u)).join(","), "|", p.text.split("\n")[0]);
  process.exit(0);
}

const orgs = await gql(`{ account { organizations { id name } } }`);
const orgId = orgs.account.organizations[0].id;
const { channels } = await gql(`query($input: ChannelsInput!){ channels(input:$input){ id name service isDisconnected } }`, { input: { organizationId: orgId } });
if (args.includes("--channels")) { console.log(channels); process.exit(0); }
if (!file) throw new Error("usage: sns-schedule.ts <posts.md>");

const listArg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1].split(",");
const only = listArg("only");
const skip = listArg("skip") ?? [];
const posts = parse(file).filter((p) => new Date(p.dueAt) > new Date() && (!only || only.includes(p.id)) && !skip.includes(p.id));
for (const p of posts) {
  const ch = channels.find((c: any) => c.service === p.service && !c.isDisconnected);
  const tag = `${p.id} ${p.service} ${p.dueAt} imgs=${p.images.length}`;
  if (!ch) { console.log("skip (no channel)", tag); continue; }
  // Check that each image is reachable before Buffer tries to fetch it.
  for (const u of p.images) if (!(await fetch(u, { method: "HEAD" })).ok) throw new Error(`image not reachable: ${u}`);
  const metadata = p.service === "instagram"
    ? { instagram: { type: "post", shouldShareToFeed: true } }
    : { threads: { type: "post", thread: [] } };
  const d = await gql(
    `mutation($input: CreatePostInput!){ createPost(input:$input){ ... on PostActionSuccess { post { id dueAt status } } ... on MutationError { message } } }`,
    { input: {
      channelId: ch.id, text: p.text, schedulingType: "automatic", mode: "customScheduled", dueAt: p.dueAt,
      needsApproval: false, assets: p.images.map((url) => ({ image: { url } })), metadata,
    } },
  );
  console.log(d.createPost.post ? "scheduled" : "error", tag, d.createPost.post?.status ?? "", d.createPost.message ?? "");
}
