const supabase = require('../config/database');

class SupabaseService {
    constructor() {
        this.storage = supabase.storage;
    }

    async getProblemList() {
        console.log(`--- [Service] SupabaseService.getProblemList ---`);
        const { data: fileList, error: listError } = await this.storage
            .from('problems')
            .list();

        if (listError) {
            console.error("[Service] Failed to list files/folders from Supabase Storage bucket 'problems'.", listError);
            throw new Error("Failed to list problems from Supabase Storage");
        }

        if (!fileList || fileList.length === 0) {
            console.warn("[Service] The 'problems' bucket is empty or the list operation returned no items.");
            return [];
        }
        
        console.log(`[Service] Raw items returned from bucket listing:`, fileList);

        const problemFolders = fileList.filter(item => item.id === null && item.name !== '.emptyFolderPlaceholder');
        console.log(`[Service] Found ${problemFolders.length} potential problem folders after filtering.`);

        if (problemFolders.length === 0) {
            console.warn("[Service] No valid folders found after filtering. Ensure folders exist and are not named '.emptyFolderPlaceholder'.");
            return [];
        }

        const problemsPromises = problemFolders.map(async (folder) => {
            const filePath = `${folder.name}/config.json`;
            const { data: configBlob, error: downloadError } = await this.storage
                .from('problems')
                .download(filePath);
            
            if (downloadError) {
                console.warn(`[Service] Could not download config for '${folder.name}'. Skipping. Error: ${downloadError.message}`);
                return null;
            }

            try {
                const configText = await configBlob.text();
                const config = JSON.parse(configText);
                return {
                    id: folder.name,
                    name: config.title || folder.name,
                    difficulty: config.difficulty || 0,
                    tags: config.tags || []
                };
            } catch(e) {
                console.warn(`[Service] Could not parse config for '${folder.name}'. Skipping. Error: ${e.message}`);
                return null;
            }
        });

        const problems = await Promise.all(problemsPromises);
        const validProblems = problems.filter(p => p !== null);
        console.log(`[Service] Successfully parsed ${validProblems.length} problem configs.`);
        console.log(`-------------------------------------------------`);
        return validProblems;
    }

    async getProblemById(problemId) {
        const filePath = `${problemId}/config.json`;
        const { data: configBlob, error: downloadError } = await this.storage
            .from('problems')
            .download(filePath);
        
        if (downloadError) {
            return null; 
        }

        try {
            const configText = await configBlob.text();
            const config = JSON.parse(configText);
            return {
                id: problemId,
                name: config.title || problemId,
                description: config.description || "No description available.",
                difficulty: config.difficulty || 0,
                tags: config.tags || []
            };
        } catch(e) {
            throw new Error(`Invalid configuration for problem ${problemId}.`);
        }
    }
}

module.exports = SupabaseService;