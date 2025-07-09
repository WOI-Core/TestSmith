const supabase = require('../config/database');

class SupabaseService {
  constructor() {
    if (SupabaseService.instance) {
      return SupabaseService.instance;
    }
    this.storage = supabase.storage;
    this.supabase = supabase;

    SupabaseService.instance = this;
  }

  /**
   * NEW FUNCTION
   * Get the list of problems from the storage bucket.
   * It filters out any file that isn't a directory (e.g., placeholder files).
   */
  async getProblemList() {
    const { data, error } = await this.storage.from('problems').list();

    if (error) {
      console.error('[SupabaseService] Error listing problems:', error);
      return [];
    }

    // Supabase's list function returns folders as items with id: null.
    // We filter to get only these directory entries.
    const problemFolders = data.filter(item => item.id === null);

    return problemFolders;
  }

  /**
   * List files in a Supabase Storage bucket
   * @param {string} bucketName - The name of the bucket
   * @param {string} folderPath - The path to the folder within the bucket
   */
  async listFiles(bucketName, folderPath = '') {
    const { data, error } = await this.storage
      .from(bucketName)
      .list(folderPath);

    if (error) {
      console.error(`[SupabaseService] Error listing files in ${bucketName}:`, error);
      return [];
    }
    return data;
  }

  /**
   * Get public URL for a file in Supabase Storage
   * @param {string} bucketName - The name of the bucket
   * @param {string} filePath - The path to the file
   */
  getPublicUrl(bucketName, filePath) {
    const { data } = this.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }
}

const instance = new SupabaseService();
module.exports = instance;