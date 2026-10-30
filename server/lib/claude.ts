import type Anthropic from "@anthropic-ai/sdk";

// Haiku 5.5 thinks by default and thinking counts toward max_tokens.
// Short formatting/extraction tasks don't need it, so turn it off.
export const LIGHT_PARAMS = {
  thinking: { type: "disabled" as const },
  output_config: { effort: "low" as const },
};

// Sonnet 5.5 can't disable thinking — keep it brief with low effort instead.
export const MAIN_PARAMS = {
  output_config: { effort: "low" as const },
};

/** Concatenated text of a response. A response can start with thinking blocks, so never read content[0]. */
export function textOf(resp: Anthropic.Message): string {
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
