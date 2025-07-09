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
   * Get the list of problems from the storage bucket.
   */
  async getProblemList() {
    const { data, error } = await this.storage.from('problems').list();

    if (error) {
      console.error('[SupabaseService] Error listing problems:', error);
      return [];
    }
    
    const problemFolders = data.filter(item => item.id === null);
    return problemFolders;
  }

  /**
   * NEW FUNCTION
   * Get the configuration JSON for a specific problem.
   * @param {string} problemName - The name of the problem folder.
   */
  async getProblemConfig(problemName) {
    const filePath = `${problemName}/config.json`;
    const { data, error } = await this.storage.from('problems').download(filePath);

    if (error) {
      console.error(`[SupabaseService] Error fetching config for ${problemName}:`, error);
      return null;
    }

    // The downloaded data is a Blob, so we need to read it as text and parse it as JSON
    try {
      const configText = await data.text();
      const configJson = JSON.parse(configText);
      return configJson;
    } catch (parseError) {
      console.error(`[SupabaseService] Error parsing config for ${problemName}:`, parseError);
      return null;
    }
  }


  /**
   * List files in a Supabase Storage bucket
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