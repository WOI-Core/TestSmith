const supabase = require('../config/database');
const BaseService = require('./BaseService');

class SupabaseService extends BaseService {
    constructor() {
        super('SupabaseService');
        this.storage = supabase.storage;
    }

    async getProblemList() {
        const { data: folders, error: listError } = await this.storage
            .from('problems')
            .list();

        if (listError) {
            this.handleError(listError, "Failed to list problems from Supabase Storage");
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
                const config = JSON.parse(await configBlob.text());
                return {
                    id: folder.name,
                    name: config.title || folder.name,
                    ...config
                };
            } catch(e) {
                console.error(`Skipping ${folder.name}: invalid config.json.`);
                return null;
            }
        });

        const problems = await Promise.all(problemsPromises);
        return problems.filter(p => p !== null);
    }

    async getProblemConfig(problemId) {
        const { data, error } = await this.storage
          .from('problems')
          .download(`${problemId}/config.json`)

        if (error) {
          this.handleError(error, `Failed to fetch config for ${problemId}`)
        }

        const config = JSON.parse(await data.text())
        return config
    }

    async getTestCases(problemId) {
        const { data: files, error } = await this.storage
          .from('problems')
          .list(`${problemId}/TestCases`)

        if (error) {
          this.handleError(error, `Failed to fetch test cases for ${problemId}`)
        }

        const testCases = []
        for (const file of files) {
          if (file.name.endsWith('.in')) {
            const caseName = file.name.replace('.in', '')
            const [inputContent, outputContent] = await Promise.all([
              this.storage.from('problems').download(`${problemId}/TestCases/${caseName}.in`).then(res => res.data.text()),
              this.storage.from('problems').download(`${problemId}/TestCases/${caseName}.out`).then(res => res.data.text()),
            ]);
            testCases.push({ input: inputContent, expectedOutput: outputContent })
          }
        }
        return testCases
    }
}

module.exports = new SupabaseService();