function parseIntOrDefault(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanOrDefault(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export const serverEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  DAYTONA_API_KEY: process.env.DAYTONA_API_KEY || "",
  DAYTONA_SNAPSHOT_NAME: process.env.DAYTONA_SNAPSHOT_NAME || "",
  DAYTONA_SANDBOX_TIMEOUT: parseIntOrDefault(process.env.DAYTONA_SANDBOX_TIMEOUT, 30000),
  CACHE_ENABLED: parseBooleanOrDefault(process.env.CACHE_ENABLED, true),
  CACHE_TTL: parseIntOrDefault(process.env.CACHE_TTL, 3600),
} as const;

export const clientEnv = {
  NEXT_PUBLIC_LLM_MODEL: process.env.NEXT_PUBLIC_LLM_MODEL || "gemini-3.1-flash-lite-preview",
} as const;

export type ServerEnv = typeof serverEnv;
export type ClientEnv = typeof clientEnv;
