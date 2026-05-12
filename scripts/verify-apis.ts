/**
 * API接続確認スクリプト — STEP 1 完了後に実行
 *
 * 使い方:
 *   npx tsx scripts/verify-apis.ts
 *
 * 確認内容:
 *   1. Claude API (Anthropic) — テキスト生成
 *   2. Tavily API — Web検索
 *   3. OpenAI API — Whisper音声変換（STEP 3 用）
 */

import Anthropic from "@anthropic-ai/sdk";

// ─── ユーティリティ ───────────────────────────────────────────
function ok(label: string) {
  console.log(`  ✅ ${label}`);
}

function fail(label: string, detail?: string) {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     ${detail}`);
}

function section(title: string) {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(50));
}

// ─── 1. Claude API ───────────────────────────────────────────
async function verifyClaude() {
  section("1. Claude API (Anthropic)");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-ant-api03-xxx")) {
    fail("ANTHROPIC_API_KEY が未設定です");
    console.log("     → .env ファイルに ANTHROPIC_API_KEY=sk-ant-... を追加してください");
    return false;
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "「GlobeHubへようこそ」と日本語で一言だけ返してください。",
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    ok(`接続成功 — レスポンス: "${text.trim()}"`);
    ok(`使用トークン: 入力 ${response.usage.input_tokens} / 出力 ${response.usage.output_tokens}`);
    return true;
  } catch (e: any) {
    fail("Claude API 接続失敗", e.message);
    return false;
  }
}

// ─── 2. Tavily API ───────────────────────────────────────────
async function verifyTavily() {
  section("2. Tavily API (Web検索)");

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.startsWith("tvly-xxx")) {
    fail("TAVILY_API_KEY が未設定です");
    console.log("     → .env ファイルに TAVILY_API_KEY=tvly-... を追加してください");
    return false;
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: "バルセロナ おすすめ観光スポット 2024",
        max_results: 2,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      fail(`Tavily API エラー: ${response.status}`, error);
      return false;
    }

    const data = await response.json() as { results: Array<{ title: string; url: string }> };
    ok(`接続成功 — ${data.results?.length ?? 0}件の検索結果を取得`);
    if (data.results?.length > 0) {
      ok(`最初の結果: "${data.results[0].title}"`);
    }
    return true;
  } catch (e: any) {
    fail("Tavily API 接続失敗", e.message);
    return false;
  }
}

// ─── 3. OpenAI API ───────────────────────────────────────────
async function verifyOpenAI() {
  section("3. OpenAI API (Whisper 音声変換 — STEP 3 用)");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-proj-xxx") || apiKey === "sk-placeholder") {
    fail("OPENAI_API_KEY が未設定です（STEP 3 実装時に必要）");
    console.log("     → 今は未設定でも問題ありません");
    return false;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      fail(`OpenAI API エラー: ${response.status}`);
      return false;
    }

    ok("接続成功 — Whisper モデル利用可能");
    return true;
  } catch (e: any) {
    fail("OpenAI API 接続失敗", e.message);
    return false;
  }
}

// ─── メイン ───────────────────────────────────────────────────
async function main() {
  console.log("\n🌍 GlobeHub AI — API接続確認スクリプト");
  console.log("   実行日時:", new Date().toLocaleString("ja-JP"));

  // .env ファイルを読み込む（カレントディレクトリ基準）
  const { readFileSync } = await import("fs");
  const { resolve } = await import("path");
  const dotenvPath = resolve(process.cwd(), ".env");
  try {
    const envContent = readFileSync(dotenvPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log("   .env ファイル: 読み込み完了");
  } catch {
    console.log("   .env ファイル: 見つかりません（環境変数を直接使用）");
  }

  const results = await Promise.allSettled([
    verifyClaude(),
    verifyTavily(),
    verifyOpenAI(),
  ]);

  const [claudeOk, tavilyOk, openaiOk] = results.map(
    (r) => r.status === "fulfilled" && r.value === true
  );

  section("結果サマリー");
  console.log(`  Claude API  : ${claudeOk ? "✅ OK" : "❌ 未設定 or エラー"}`);
  console.log(`  Tavily API  : ${tavilyOk ? "✅ OK" : "❌ 未設定 or エラー"}`);
  console.log(`  OpenAI API  : ${openaiOk ? "✅ OK" : "⏳ STEP 3 で設定予定"}`);

  if (claudeOk && tavilyOk) {
    console.log("\n  🎉 主要 API の準備完了！STEP 2 のデータ構造拡張に進めます。");
  } else if (!claudeOk) {
    console.log("\n  ⚠️  ANTHROPIC_API_KEY を .env に追加してから再実行してください。");
    console.log("     取得先: https://console.anthropic.com");
  }

  console.log();
}

main().catch((e) => {
  console.error("スクリプト実行エラー:", e);
  process.exit(1);
});
