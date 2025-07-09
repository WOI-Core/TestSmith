const supabase = require('../config/database'); // <-- This now imports the client directly

class SupabaseService {
  constructor() {
    if (SupabaseService.instance) {
      return SupabaseService.instance;
    }
    // Use the imported client directly
    this.storage = supabase.storage; 
    this.supabase = supabase;

    SupabaseService.instance = this;
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