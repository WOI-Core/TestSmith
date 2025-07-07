/**
 * Cache Service
 * Provides in-memory caching with TTL support
 */
const BaseService = require("./BaseService")
const config = require("../config")

class CacheService extends BaseService {
  constructor() {
    super("CacheService")
    this.cache = new Map()
    this.ttl = config.cache.ttl
    this.maxSize = config.cache.maxSize
  }

  /**
   * Set cache entry with TTL
   */
  set(key, data, customTtl = null) {
    try {
      // Remove oldest entries if cache is full
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        this.cache.delete(firstKey)
      }

      const ttl = customTtl || this.ttl
      const entry = {
        data,
        timestamp: Date.now(),
        ttl,
      }

      this.cache.set(key, entry)

      // Set cleanup timer
      setTimeout(() => {
        this.cache.delete(key)
      }, ttl)

      this.log(`Cached entry: ${key} (TTL: ${ttl}ms)`)
    } catch (error) {
      this.handleError(error, "Cache set operation failed")
    }
  }

  /**
   * Get cache entry if not expired
   */
  get(key) {
    try {
      const entry = this.cache.get(key)

      if (!entry) {
        return null
      }

      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        return null
      }

      this.log(`Cache hit: ${key}`)
      return entry.data
    } catch (error) {
      this.handleError(error, "Cache get operation failed")
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear()
    this.log("Cache cleared")
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    }
  }
}

module.exports = new CacheService()
