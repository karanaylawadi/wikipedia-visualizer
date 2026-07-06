const CACHE_VERSION = "results-v4-premium-editorial";

/**
 * Normalizes a topic string to create a safe, consistent cache key.
 * - lowercase
 * - trim
 * - replace spaces with hyphens
 * - remove unsafe characters (retaining alphanumeric and hyphens only)
 */
export function createCacheKey(topic: string): string {
  return topic
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

/**
 * Retrieves cached analysis data for a given normalized key.
 * Returns null if cache is disabled, missed, or encounters an error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedAnalysis(key: string): Promise<any | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  const fullKey = `wiki:analysis:${CACHE_VERSION}:${key}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", fullKey]),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      console.warn(`Upstash cache hit check failed with HTTP status ${res.status}`);
      return null;
    }

    const body = await res.json();
    if (body && typeof body.result === "string") {
      return JSON.parse(body.result);
    }
    return null;
  } catch (error) {
    console.warn("getCachedAnalysis failed:", error);
    return null;
  }
}

/**
 * Stores analysis data under a given normalized key.
 * Returns true if successful, false otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setCachedAnalysis(key: string, data: any): Promise<boolean> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return false;
  }

  const fullKey = `wiki:analysis:${CACHE_VERSION}:${key}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", fullKey, JSON.stringify(data)]),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      console.warn(`Upstash cache store failed with HTTP status ${res.status}`);
      return false;
    }

    const body = await res.json();
    return body && body.result === "OK";
  } catch (error) {
    console.warn("setCachedAnalysis failed:", error);
    return false;
  }
}
