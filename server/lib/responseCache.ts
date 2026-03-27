interface CacheEntry {
  spotId: string;
  userText: string;
  response: string;
  timestamp: number;
}

class ResponseCache {
  private cache: CacheEntry[] = [];
  private readonly maxSize = 100;
  private readonly ttlMs = 2 * 60 * 1000; // 2 minutes

  /**
   * Calculate simple similarity between two strings
   */
  private similarity(a: string, b: string): number {
    const normalize = (s: string) => s.toLowerCase().trim();
    const normA = normalize(a);
    const normB = normalize(b);
    
    if (normA === normB) return 1.0;
    
    const longer = normA.length > normB.length ? normA : normB;
    const shorter = normA.length > normB.length ? normB : normA;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Get cached response if similar input exists within TTL
   */
  get(spotId: string, userText: string): string | null {
    const now = Date.now();
    
    // Clean expired entries
    this.cache = this.cache.filter((entry) => now - entry.timestamp < this.ttlMs);
    
    // Find similar entry
    for (const entry of this.cache) {
      if (entry.spotId === spotId) {
        const sim = this.similarity(entry.userText, userText);
        if (sim > 0.95) {
          return entry.response;
        }
      }
    }
    
    return null;
  }

  /**
   * Set cached response (LRU eviction if full)
   */
  set(spotId: string, userText: string, response: string): void {
    const entry: CacheEntry = {
      spotId,
      userText,
      response,
      timestamp: Date.now(),
    };
    
    // Add to front
    this.cache.unshift(entry);
    
    // Evict oldest if over limit
    if (this.cache.length > this.maxSize) {
      this.cache = this.cache.slice(0, this.maxSize);
    }
  }
}

export const responseCache = new ResponseCache();
