#!/usr/bin/env tsx
/**
 * Migration script to rename existing problem folders to follow new slugification rules.
 * This script will:
 * 1. Scan all existing folders in Supabase storage
 * 2. Identify folders with names that don't match new slug rules
 * 3. Create a mapping of old names to new slugified names
 * 4. Rename folders and update references
 * 5. Log all changes for audit purposes
 */

import { createClient } from '@supabase/supabase-js';
import { slugify, isValidSlug, createUniqueSlug, batchSlugify } from '../lib/slugify';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET_NAME = 'problems';
const DRY_RUN = process.env.DRY_RUN === 'true';
const LOG_FILE = path.join(__dirname, '../logs/folder-migration.log');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface MigrationResult {
  original: string;
  slug: string;
  needsRename: boolean;
  success?: boolean;
  error?: string;
}

interface FileItem {
  name: string;
  id: string | null;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: any;
}

class FolderMigrator {
  private logEntries: string[] = [];

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.logEntries.push(logEntry);
  }

  private async saveLog(): Promise<void> {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.writeFileSync(LOG_FILE, this.logEntries.join('\n') + '\n', 'utf8');
    this.log(`Migration log saved to: ${LOG_FILE}`);
  }

  /**
   * Get all folders from Supabase storage
   */
  private async getFolders(): Promise<string[]> {
    this.log('Fetching folders from Supabase storage...');
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1000,
        offset: 0,
      });

    if (error) {
      throw new Error(`Failed to fetch folders: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Filter for folders (items with id === null in Supabase storage)
    const folders = data
      .filter((item: FileItem) => item.id === null && item.name !== '.emptyFolderPlaceholder')
      .map((item: FileItem) => item.name);

    this.log(`Found ${folders.length} folders: ${folders.join(', ')}`);
    return folders;
  }

  /**
   * Analyze folders and create migration plan
   */
  private createMigrationPlan(folders: string[]): MigrationResult[] {
    this.log('Creating migration plan...');
    
    const slugResults = batchSlugify(folders, {
      caseStyle: 'snake',
      maxLength: 50,
      preserveNumbers: true
    });

    const migrationPlan: MigrationResult[] = slugResults.map(result => ({
      original: result.original,
      slug: result.slug,
      needsRename: result.changed || !isValidSlug(result.original, {
        caseStyle: 'snake',
        maxLength: 50,
        preserveNumbers: true
      })
    }));

    const foldersNeedingRename = migrationPlan.filter(item => item.needsRename);
    this.log(`Analysis complete:`);
    this.log(`  Total folders: ${migrationPlan.length}`);
    this.log(`  Folders needing rename: ${foldersNeedingRename.length}`);
    
    if (foldersNeedingRename.length > 0) {
      this.log('Folders that will be renamed:');
      foldersNeedingRename.forEach(item => {
        this.log(`  "${item.original}" → "${item.slug}"`);
      });
    }

    return migrationPlan;
  }

  /**
   * List all files in a folder
   */
  private async listFilesInFolder(folderName: string): Promise<string[]> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderName, {
        limit: 1000,
        offset: 0,
      });

    if (error) {
      throw new Error(`Failed to list files in folder ${folderName}: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Recursively get files from subdirectories
    const allFiles: string[] = [];
    
    for (const item of data) {
      if (item.id === null) {
        // It's a subfolder, recursively list its contents
        const subfolderFiles = await this.listFilesInFolder(`${folderName}/${item.name}`);
        allFiles.push(...subfolderFiles.map(file => `${item.name}/${file}`));
      } else {
        // It's a file
        allFiles.push(item.name);
      }
    }

    return allFiles;
  }

  /**
   * Rename a single folder by copying all files and deleting the old folder
   */
  private async renameFolder(oldName: string, newName: string): Promise<boolean> {
    this.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Renaming folder: "${oldName}" → "${newName}"`);

    if (DRY_RUN) {
      this.log('[DRY RUN] Skipping actual rename operation');
      return true;
    }

    try {
      // 1. List all files in the old folder
      const files = await this.listFilesInFolder(oldName);
      this.log(`  Found ${files.length} files to migrate`);

      if (files.length === 0) {
        this.log('  No files to migrate, removing empty folder');
        return true;
      }

      // 2. Copy each file to the new location
      const copyPromises = files.map(async (file) => {
        const oldPath = `${oldName}/${file}`;
        const newPath = `${newName}/${file}`;

        this.log(`    Copying: ${oldPath} → ${newPath}`);

        // Download the file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(BUCKET_NAME)
          .download(oldPath);

        if (downloadError) {
          throw new Error(`Failed to download ${oldPath}: ${downloadError.message}`);
        }

        // Upload to new location
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(newPath, fileData, {
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${newPath}: ${uploadError.message}`);
        }
      });

      await Promise.all(copyPromises);
      this.log(`  Successfully copied ${files.length} files`);

      // 3. Delete all files from the old folder
      const filePaths = files.map(file => `${oldName}/${file}`);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filePaths);

      if (deleteError) {
        this.log(`  Warning: Failed to delete some old files: ${deleteError.message}`);
      } else {
        this.log(`  Successfully deleted ${files.length} old files`);
      }

      return true;
    } catch (error) {
      this.log(`  ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Update database references to use new folder names
   */
  private async updateDatabaseReferences(migrationResults: MigrationResult[]): Promise<void> {
    this.log('Updating database references...');

    const successfulRenames = migrationResults.filter(result => 
      result.needsRename && result.success
    );

    if (successfulRenames.length === 0) {
      this.log('No database updates needed');
      return;
    }

    if (DRY_RUN) {
      this.log('[DRY RUN] Would update the following database records:');
      successfulRenames.forEach(result => {
        this.log(`  problem_id: "${result.original}" → "${result.slug}"`);
      });
      return;
    }

    for (const result of successfulRenames) {
      try {
        const { error } = await supabase
          .from('problems')
          .update({ 
            problem_id: result.slug,
            problem_name: result.slug 
          })
          .eq('problem_id', result.original);

        if (error) {
          this.log(`  Warning: Failed to update database for ${result.original}: ${error.message}`);
        } else {
          this.log(`  Updated database record: ${result.original} → ${result.slug}`);
        }
      } catch (error) {
        this.log(`  Error updating database for ${result.original}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Main migration function
   */
  async migrate(): Promise<void> {
    this.log('🚀 Starting folder name migration...');
    this.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);

    try {
      // 1. Get all folders
      const folders = await this.getFolders();
      if (folders.length === 0) {
        this.log('No folders found to migrate');
        return;
      }

      // 2. Create migration plan
      const migrationPlan = this.createMigrationPlan(folders);
      const foldersToRename = migrationPlan.filter(item => item.needsRename);

      if (foldersToRename.length === 0) {
        this.log('✅ All folders already follow naming conventions');
        return;
      }

      // 3. Confirm migration (unless in non-interactive mode)
      if (!DRY_RUN && process.env.AUTO_CONFIRM !== 'true') {
        console.log('\n⚠️  This will rename the following folders:');
        foldersToRename.forEach(item => {
          console.log(`   "${item.original}" → "${item.slug}"`);
        });
        console.log('\nPress Ctrl+C to cancel, or set AUTO_CONFIRM=true to skip this prompt');
        
        // Simple pause for manual confirmation
        await new Promise(resolve => {
          console.log('\nPress Enter to continue...');
          process.stdin.once('data', resolve);
        });
      }

      // 4. Perform renames
      this.log('Starting folder renames...');
      let successCount = 0;
      let failureCount = 0;

      for (const item of foldersToRename) {
        const success = await this.renameFolder(item.original, item.slug);
        item.success = success;
        
        if (success) {
          successCount++;
          this.log(`✅ Successfully renamed: ${item.original} → ${item.slug}`);
        } else {
          failureCount++;
          this.log(`❌ Failed to rename: ${item.original}`);
        }
      }

      // 5. Update database references
      await this.updateDatabaseReferences(migrationPlan);

      // 6. Summary
      this.log('\n📊 Migration Summary:');
      this.log(`  Total folders: ${migrationPlan.length}`);
      this.log(`  Folders needing rename: ${foldersToRename.length}`);
      this.log(`  Successful renames: ${successCount}`);
      this.log(`  Failed renames: ${failureCount}`);

      if (failureCount === 0) {
        this.log('🎉 Migration completed successfully!');
      } else {
        this.log('⚠️  Migration completed with some failures. Check logs for details.');
      }

    } catch (error) {
      this.log(`💥 Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      await this.saveLog();
    }
  }
}

// Main execution
async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
    process.exit(1);
  }

  const migrator = new FolderMigrator();
  
  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { FolderMigrator }; 