// server/services/SupabaseService.js
const supabase = require('../config/database');

class SupabaseService {
    constructor() {
        this.storage = supabase.storage;
    }

    async getProblemList() {
        const { data: fileList, error: listError } = await this.storage
            .from('problems')
            .list();

        if (listError) {
            throw new Error("Failed to list problems from Supabase Storage");
        }

        if (!fileList || fileList.length === 0) {
            return [];
        }

        const problemFolders = fileList.filter(item => item.id === null && item.name !== '.emptyFolderPlaceholder');

        if (problemFolders.length === 0) {
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

    async uploadProblemFiles(problemId, problemName, markdownContent, solutionCode) {
        const { error: statementError } = await this.storage
            .from('problems')
            .upload(`${problemId}/Problems/${problemName}.md`, markdownContent, {
                contentType: 'text/markdown',
                upsert: true
            });

        if (statementError) {
            throw new Error(`Failed to upload problem statement (${problemId}/Problems/${problemName}.md) for ${problemId}.`);
        }

        const { error: solutionError } = await this.storage
            .from('problems')
            .upload(`${problemId}/Solutions/${problemName}.cpp`, solutionCode, {
                contentType: 'text/plain',
                upsert: true
            });

        if (solutionError) {
            throw new Error(`Failed to upload solution code (${problemId}/Solutions/${problemName}.cpp) for ${problemId}.`);
        }
    }

    async uploadProblemConfig(problemId, configContent) {
        const { error: configError } = await this.storage
            .from('problems')
            .upload(`${problemId}/config.json`, configContent, {
                contentType: 'application/json',
                upsert: true
            });

        if (configError) {
            throw new Error(`Failed to upload problem config for ${problemId}.`);
        }
    }

    async downloadProblemFile(problemId, fileName, isSolution = false) {
        let filePath;
        if (fileName === 'config.json') {
            filePath = `${problemId}/config.json`;
        } else if (isSolution) {
            filePath = `${problemId}/Solutions/${fileName}`;
        } else {
            filePath = `${problemId}/Problems/${fileName}`;
        }

        const { data: fileBlob, error: downloadError } = await this.storage
            .from('problems')
            .download(filePath);

        if (downloadError) {
            return null;
        }

        try {
            return await fileBlob.text();
        } catch (e) {
            return null;
        }
    }

    /**
     * Lists files within a specific folder inside the 'problems' bucket.
     * @param {string} folderPath The path to the folder (e.g., 'CombinatorialKingdom/Problems').
     * @returns {Promise<Array<{name: string, id: string|null}>>} An array of file objects.
     */
    async listFilesInFolder(folderPath) {
        const { data, error } = await this.storage
            .from('problems')
            .list(folderPath, {
                limit: 100, // Adjust limit as needed
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (error) {
            console.error(`Error listing files in folder ${folderPath}:`, error);
            throw new Error(`Failed to list files in folder ${folderPath}.`);
        }
        return data;
    }
}

module.exports = SupabaseService;