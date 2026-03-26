import { createHash } from "node:crypto";

type CacheValue = {
  value: unknown;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheValue>();

export function buildProblemHash(problem: string) {
  return createHash("sha256").update(problem.trim()).digest("hex");
}

export function getCachedSolution(problemHash: string) {
  const item = cache.get(problemHash);
  if (!item) return undefined;
  if (Date.now() > item.expiresAt) {
    cache.delete(problemHash);
    return undefined;
  }
  return item.value;
}

export function cacheSolution(problemHash: string, solution: unknown, ttlMs = DEFAULT_TTL_MS) {
  cache.set(problemHash, {
    value: solution,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearMathCache() {
  cache.clear();
}
