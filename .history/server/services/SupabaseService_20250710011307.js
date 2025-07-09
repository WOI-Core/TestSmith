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

        console.log(`[Service] Raw items returned from bucket listing:`, fileList);

        if (!fileList || fileList.length === 0) {
            console.warn("[Service] The 'problems' bucket is empty or the list operation returned no items.");
            return [];
        }

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

    /**
     * Uploads problem markdown content and solution code to Supabase Storage.
     * Files will be stored in a folder named after the problemId:
     * problems/{problemId}/statement.md
     * problems/{problemId}/solution.txt
     * @param {string} problemId The unique ID of the problem.
     * @param {string} markdownContent The markdown content of the problem statement.
     * @param {string} solutionCode The solution code for the problem.
     */
    async uploadProblemFiles(problemId, markdownContent, solutionCode) {
        // Upload problem statement markdown
        const { error: statementError } = await this.storage
            .from('problems')
            .upload(`${problemId}/statement.md`, markdownContent, {
                contentType: 'text/markdown',
                upsert: true // Overwrite if file exists
            });

        if (statementError) {
            console.error(`Error uploading statement.md for problem ${problemId}:`, statementError);
            throw new Error(`Failed to upload problem statement for ${problemId}.`);
        }

        // Upload solution code
        const { error: solutionError } = await this.storage
            .from('problems')
            .upload(`${problemId}/solution.txt`, solutionCode, {
                contentType: 'text/plain',
                upsert: true // Overwrite if file exists
            });

        if (solutionError) {
            console.error(`Error uploading solution.txt for problem ${problemId}:`, solutionError);
            throw new Error(`Failed to upload solution code for ${problemId}.`);
        }

        console.log(`Successfully uploaded files for problem ${problemId} to storage.`);
    }
}

module.exports = SupabaseService;
