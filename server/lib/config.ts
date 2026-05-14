// OpenAI (legacy spot-chat feature)
export const AI_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  MAX_OUTPUT_TOKENS: parseInt(process.env.MAX_OUTPUT_TOKENS || "220", 10),
  TEMPERATURE: parseFloat(process.env.TEMPERATURE || "0.6"),
  MAX_REQ_TOKENS: parseInt(process.env.MAX_REQ_TOKENS || "1200", 10),
  API_BUDGET_USD_MONTH: parseFloat(process.env.API_BUDGET_USD_MONTH || "5"),
  ENABLE_STT: process.env.ENABLE_STT === "true",
};

// Claude API (Anthropic) — used for AI formatting, trip planning, chat
export const CLAUDE_CONFIG = {
  MODEL: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
  // Haiku: light tasks (text formatting, short responses) — ~20x cheaper than Sonnet
  MODEL_LIGHT: "claude-haiku-4-5-20251001",
  MAX_OUTPUT_TOKENS: parseInt(process.env.CLAUDE_MAX_OUTPUT_TOKENS || "1500", 10),
  TEMPERATURE: parseFloat(process.env.CLAUDE_TEMPERATURE || "0.7"),
  API_KEY: process.env.ANTHROPIC_API_KEY || "",
};

// Tavily — web search for trip planning (STEP 5)
export const TAVILY_CONFIG = {
  API_KEY: process.env.TAVILY_API_KEY || "",
  MAX_RESULTS: 5,
};

// Pexels — spot photos (free: 25,000 req/month)
export const PEXELS_CONFIG = {
  API_KEY: process.env.PEXELS_API_KEY || "",
};

// Feature flags — each flag turns on as steps complete
export const FEATURES = {
  AI_FORMAT: process.env.ENABLE_AI_FORMAT === "true",      // STEP 4
  TRIP_PLANNER: process.env.ENABLE_TRIP_PLANNER === "true", // STEP 5
  STT: process.env.ENABLE_STT === "true",                   // STEP 3
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
  // Claude pricing (with prompt cache discount factored in at 80%)
  "claude-sonnet-4-6": {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
    cacheWrite: 3.75 / 1_000_000,
    cacheRead: 0.30 / 1_000_000,
  },
} as const;
