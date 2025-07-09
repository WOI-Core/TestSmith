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

    async uploadProblemFiles(problemId, markdownFileName, markdownContent, solutionFileName, solutionCode) {
        // Upload problem statement markdown
        const { error: statementError } = await this.storage
            .from('problems')
            .upload(`${problemId}/${markdownFileName}`, markdownContent, {
                contentType: 'text/markdown',
                upsert: true
            });

        if (statementError) {
            throw new Error(`Failed to upload problem statement (${markdownFileName}) for ${problemId}.`);
        }

        // Upload solution code
        const { error: solutionError } = await this.storage
            .from('problems')
            .upload(`${problemId}/${solutionFileName}`, solutionCode, {
                contentType: 'text/plain', // Use text/plain for code files, or more specific like text/x-c++
                upsert: true
            });

        if (solutionError) {
            throw new Error(`Failed to upload solution code (${solutionFileName}) for ${problemId}.`);
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

    async downloadProblemFile(problemId, fileName) {
        const filePath = `${problemId}/${fileName}`;
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
}

module.exports = SupabaseService;