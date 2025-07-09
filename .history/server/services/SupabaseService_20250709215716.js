const supabase = require('../config/database');

class SupabaseService {
    constructor() {
        this.storage = supabase.storage;
    }

    async getProblemById(problemId) {
        console.log(`--- [Service] SupabaseService.getProblemById ---`);
        console.log(`[Service] Attempting to fetch config for problem ID: "${problemId}"`);
        
        const filePath = `${problemId}/config.json`;
        console.log(`[Service] Full file path in bucket: "${filePath}"`);

        const { data: configBlob, error: downloadError } = await this.storage
            .from('problems')
            .download(filePath);
        
        if (downloadError) {
            console.error(`[Service] SUPABASE DOWNLOAD FAILED for "${filePath}".`);
            console.error('[Service] Supabase Error Details:', downloadError);
            console.log(`[Service] Returning null, which will cause a 404.`);
            console.log(`-------------------------------------------------`);
            return null; 
        }

        console.log(`[Service] Successfully downloaded "${filePath}". Now parsing...`);
        try {
            const configText = await configBlob.text();
            const config = JSON.parse(configText);
            
            console.log(`[Service] Successfully parsed config.json for "${problemId}".`);
            console.log(`-------------------------------------------------`);
            return {
                id: problemId,
                name: config.title || problemId,
                description: config.description || "No description available.",
                difficulty: config.difficulty || 0,
                tags: config.tags || []
            };
        } catch(e) {
            console.error(`[Service] JSON PARSE FAILED for "${problemId}".`);
            console.error('[Service] Parse Error Details:', e);
            console.log(`-------------------------------------------------`);
            throw new Error(`Invalid configuration file for problem ${problemId}.`);
        }
    }

    async getProblemList() {
        console.log(`--- [Service] SupabaseService.getProblemList ---`);
        const { data: folders, error: listError } = await this.storage
            .from('problems')
            .list();

        if (listError) {
            console.error("[Service] Failed to list problems from Supabase Storage", listError);
            throw new Error("Failed to list problems");
        }

        const problemFolders = folders.filter(item => item.id === null && item.name !== 'Anonymous');
        console.log(`[Service] Found ${problemFolders.length} potential problem folders.`);

        const problemsPromises = problemFolders.map(async (folder) => {
            const filePath = `${folder.name}/config.json`;
            const { data: configBlob, error: downloadError } = await this.storage
                .from('problems')
                .download(filePath);
            
            if (downloadError) {
                console.warn(`[Service] Could not download config for ${folder.name}, skipping.`);
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
                console.warn(`[Service] Could not parse config for ${folder.name}, skipping.`, e);
                return null;
            }
        });

        const problems = await Promise.all(problemsPromises);
        const validProblems = problems.filter(p => p !== null);
        console.log(`[Service] Successfully parsed ${validProblems.length} problem configs.`);
        console.log(`-------------------------------------------------`);
        return validProblems;
    }
}

module.exports = SupabaseService;