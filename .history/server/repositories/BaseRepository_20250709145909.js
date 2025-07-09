// This now directly imports the initialized Supabase client
const supabase = require('../config/database');

class BaseRepository {
  constructor(tableName) {
    // Assign the imported client to this.supabase
    this.supabase = supabase;
    this.tableName = tableName;
  }
}

module.exports = BaseRepository;