/**
 * Estimate token count from text
 * Rough approximation: Japanese ~2 chars/token, English ~4 chars/token
 */
export function estimateTokens(text: string): number {
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  const otherChars = text.length - japaneseChars;
  
  // Japanese: ~2 chars per token, English/other: ~4 chars per token
  return Math.ceil(japaneseChars / 2 + otherChars / 4);
}

/**
 * Truncate text to approximate token limit
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // Calculate approximate character limit
  const ratio = maxTokens / estimatedTokens;
  const targetLength = Math.floor(text.length * ratio * 0.9); // 90% to be safe
  
  const truncated = text.substring(0, targetLength);
  return truncated + "…（省略）";
}

/**
 * Compress conversation history to key points (max 3 lines)
 */
export function compressHistory(turns: Array<{ role: string; content: string }>): string {
  if (turns.length === 0) return "";
  
  const recentTurns = turns.slice(-2); // Last user-assistant pair
  const points: string[] = [];
  
  for (const turn of recentTurns) {
    if (turn.role === "user") {
      const summary = truncateToTokens(turn.content, 30);
      points.push(`Q: ${summary}`);
    } else {
      const summary = truncateToTokens(turn.content, 30);
      points.push(`A: ${summary}`);
    }
  }
  
  return points.slice(0, 3).join("\n");
}
