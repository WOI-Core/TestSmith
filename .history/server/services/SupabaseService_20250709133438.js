const BaseService = require("./BaseService")
const DatabaseManager = require("../config/database")

class SupabaseService extends BaseService {
  constructor() {
    super("SupabaseService")
    this.storage = DatabaseManager.getDatabase().storage
  }

  async getProblemList() {
    const { data, error } = await this.storage.from('problems').list()
    if (error) {
      this.handleError(error, "Failed to fetch problem list from Supabase Storage")
    }
    return data.filter(item => !item.name.includes('.'));
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

module.exports = new SupabaseService()