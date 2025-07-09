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

        const problemFolders = folders.filter(item => item.id === null);

        const problemsPromises = problemFolders.map(async (folder) => {
            const { data: configBlob, error: downloadError } = await this.storage
                .from('problems')
                .download(`${folder.name}/config.json`);
            
            if (downloadError) {
                console.error(`Skipping ${folder.name}: config.json not found.`);
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
                console.error(`Skipping ${folder.name}: invalid config.json.`, e);
                return null;
            }
        });

        const problems = await Promise.all(problemsPromises);
        return problems.filter(p => p !== null);
    }
}

module.exports = SupabaseService;