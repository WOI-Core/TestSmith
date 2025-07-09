const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isConnected = false;
  }

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

  getDatabase() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async close() {
    console.log('Supabase client does not require explicit closing.');
    return Promise.resolve();
  }
}

module.exports = new DatabaseManager();