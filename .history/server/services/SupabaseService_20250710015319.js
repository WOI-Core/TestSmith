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

    // Updated paths for markdown and solution files based on the new structure
    async uploadProblemFiles(problemId, problemName, markdownContent, solutionCode) {
        // Upload problem statement markdown to problems/{problemId}/Problems/{problemName}.md
        const { error: statementError } = await this.storage
            .from('problems')
            .upload(`${problemId}/Problems/${problemName}.md`, markdownContent, {
                contentType: 'text/markdown',
                upsert: true
            });

        if (statementError) {
            throw new Error(`Failed to upload problem statement (${problemId}/Problems/${problemName}.md) for ${problemId}.`);
        }

        // Upload solution code to problems/{problemId}/Solutions/{problemName}.cpp
        const { error: solutionError } = await this.storage
            .from('problems')
            .upload(`${problemId}/Solutions/${problemName}.cpp`, solutionCode, {
                contentType: 'text/plain', // Using text/plain, adjust if specific language types are needed
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

    // Updated paths for markdown and solution files based on the new structure
    async downloadProblemFile(problemId, fileName, isSolution = false) {
        let filePath;
        if (fileName === 'config.json') {
            filePath = `${problemId}/config.json`;
        } else if (isSolution) {
            // For solution files: problems/{problemId}/Solutions/{fileName}
            filePath = `${problemId}/Solutions/${fileName}`;
        } else {
            // For markdown files: problems/{problemId}/Problems/{fileName}
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
}

module.exports = SupabaseService;