const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

class DatabaseManager {
  constructor() {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }
    this.db = createClient(config.supabase.url, config.supabase.serviceKey);
    this.isConnected = true;
    console.log('✅ Supabase client initialized');
    DatabaseManager.instance = this;
  }

  getDatabase() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
}

const instance = new DatabaseManager();
module.exports = instancemodule.exports = instance.getDatabase();