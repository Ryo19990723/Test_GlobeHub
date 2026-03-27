export const AI_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  MAX_OUTPUT_TOKENS: parseInt(process.env.MAX_OUTPUT_TOKENS || "220", 10),
  TEMPERATURE: parseFloat(process.env.TEMPERATURE || "0.6"),
  MAX_REQ_TOKENS: parseInt(process.env.MAX_REQ_TOKENS || "1200", 10),
  API_BUDGET_USD_MONTH: parseFloat(process.env.API_BUDGET_USD_MONTH || "5"),
  ENABLE_STT: process.env.ENABLE_STT === "true",
};

export const TOKEN_PRICING = {
  "gpt-4o-mini": {
    input: 0.15 / 1_000_000,
    output: 0.6 / 1_000_000,
  },
  "gpt-4o": {
    input: 2.5 / 1_000_000,
    output: 10.0 / 1_000_000,
  },
} as const;
