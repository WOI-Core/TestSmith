/**
 * Database Configuration and Connection Management
 * Handles Supabase database setup.
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Initialize Supabase client
   */
  async connect() {
    try {
      this.db = createClient(config.supabase.url, config.supabase.serviceKey);
      console.log('✅ Connected to Supabase');
      this.isConnected = true;
      return this.db;
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  /**
   * Get Supabase client instance
   */
  getDatabase() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Close database connection (not needed for Supabase client)
   */
  async close() {
    console.log('Supabase client does not require explicit closing.');
    return Promise.resolve();
  }
}

// Export singleton instance
module.exports = new DatabaseManager();