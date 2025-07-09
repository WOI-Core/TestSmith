const supabase = require('../config/database');

class SupabaseService {
    constructor() {
        this.storage = supabase.storage;
    }

    async getProblemList() {
        const { data: folders, error: listError } = await this.storage
            .from('problems')
            .list();

        if (listError) {
            console.error("Failed to list problems from Supabase Storage", listError);
            throw new Error("Failed to list problems from Supabase Storage");
        }

        const problemFolders = folders.filter(item => item.id === null && item.name !== 'Anonymous');

        const problemsPromises = problemFolders.map(async (folder) => {
            const { data: configBlob, error: downloadError } = await this.storage
                .from('problems')
                .download(`${folder.name}/config.json`);
            
            if (downloadError) {
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
                return null;
            }
        });

        const problems = await Promise.all(problemsPromises);
        return problems.filter(p => p !== null);
    }

    async getProblemById(problemId) {
        const { data: configBlob, error: downloadError } = await this.storage
            .from('problems')
            .download(`${problemId}/config.json`);
        
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