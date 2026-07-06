const CACHE_VERSION = "results-v11-editorial-engine";

export function createCacheKey(topic: string): string {
  return topic
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

export async function getCachedAnalysis(key: string): Promise<Record<string, unknown> | null> {
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
      return null;
    }

    const body = await res.json() as { result?: string };
    if (body && typeof body.result === "string") {
      return JSON.parse(body.result) as Record<string, unknown>;
    }
    return null;
  } catch (error) {
    console.warn("getCachedAnalysis failed:", error);
    return null;
  }
}

export async function setCachedAnalysis(key: string, data: Record<string, unknown>): Promise<boolean> {
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
      return false;
    }

    const body = await res.json() as { result?: string };
    return body && body.result === "OK";
  } catch (error) {
    console.warn("setCachedAnalysis failed:", error);
    return false;
  }
}

export async function getCachedStage(topicKey: string, stageName: string): Promise<unknown | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  const fullKey = `wiki:analysis:${CACHE_VERSION}:${topicKey}:${stageName}`;
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
      return null;
    }

    const body = await res.json() as { result?: string };
    if (body && typeof body.result === "string") {
      return JSON.parse(body.result);
    }
    return null;
  } catch (error) {
    console.warn(`getCachedStage for ${stageName} failed:`, error);
    return null;
  }
}

export async function setCachedStage(topicKey: string, stageName: string, data: unknown): Promise<boolean> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return false;
  }

  const fullKey = `wiki:analysis:${CACHE_VERSION}:${topicKey}:${stageName}`;
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
      return false;
    }

    const body = await res.json() as { result?: string };
    return body && body.result === "OK";
  } catch (error) {
    console.warn(`setCachedStage for ${stageName} failed:`, error);
    return false;
  }
}
