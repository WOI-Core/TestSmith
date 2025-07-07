/**
 * GitHub Service
 * Handles all GitHub API interactions with caching
 */
const fetch = require("node-fetch")
const BaseService = require("./BaseService")
const CacheService = require("./CacheService")
const config = require("../config")

class GitHubService extends BaseService {
  constructor() {
    super("GitHubService")
    this.token = config.services.github.token
    this.repoBase = config.services.github.repoBase
    this.headers = {
      Authorization: `Bearer ${this.token}`,
      "User-Agent": "GraderSmith-Platform",
    }
  }

  /**
   * Get problem list from GitHub
   */
  async getProblemList() {
    const cacheKey = "github:problem-list"

    try {
      // Check cache first
      const cached = CacheService.get(cacheKey)
      if (cached) {
        return cached
      }

      this.log("Fetching problem list from GitHub")

      const response = await fetch(this.repoBase, {
        headers: this.headers,
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const problems = data.filter((item) => item.type === "dir")

      // Cache the result
      CacheService.set(cacheKey, problems)

      this.log(`Retrieved ${problems.length} problems from GitHub`)
      return problems
    } catch (error) {
      this.handleError(error, "Failed to fetch problem list")
    }
  }

  /**
   * Get test cases for a specific problem
   */
  async getTestCases(problemId) {
    this.validateRequired({ problemId }, ["problemId"])

    const cacheKey = `github:testcases:${problemId}`

    try {
      // Check cache first
      const cached = CacheService.get(cacheKey)
      if (cached) {
        return cached
      }

      this.log(`Fetching test cases for problem: ${problemId}`)

      const inputsUrl = `${this.repoBase}/${problemId}/TestCases/Inputs`
      const outputsUrl = `${this.repoBase}/${problemId}/TestCases/Outputs`

      const [inputsResponse, outputsResponse] = await Promise.all([
        fetch(inputsUrl, { headers: this.headers }),
        fetch(outputsUrl, { headers: this.headers }),
      ])

      if (!inputsResponse.ok) {
        throw new Error(`Failed to fetch inputs: ${inputsResponse.statusText}`)
      }
      if (!outputsResponse.ok) {
        throw new Error(`Failed to fetch outputs: ${outputsResponse.statusText}`)
      }

      const inputFiles = await inputsResponse.json()
      const outputFiles = await outputsResponse.json()

      // Sort files numerically
      const sortNumerically = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })
      inputFiles.sort(sortNumerically)
      outputFiles.sort(sortNumerically)

      if (inputFiles.length === 0 || inputFiles.length !== outputFiles.length) {
        throw new Error("Mismatched or missing input/output files")
      }

      // Fetch file contents
      const testCases = await Promise.all(
        inputFiles.map(async (inputFile, index) => {
          const outputFile = outputFiles[index]

          const [inputContent, outputContent] = await Promise.all([
            fetch(inputFile.download_url, { headers: this.headers }).then((r) => r.text()),
            fetch(outputFile.download_url, { headers: this.headers }).then((r) => r.text()),
          ])

          return {
            input: inputContent,
            expectedOutput: outputContent,
          }
        }),
      )

      // Cache the result
      CacheService.set(cacheKey, testCases)

      this.log(`Retrieved ${testCases.length} test cases for ${problemId}`)
      return testCases
    } catch (error) {
      this.handleError(error, `Failed to fetch test cases for ${problemId}`)
    }
  }

  /**
   * Get problem configuration
   */
  async getProblemConfig(problemId) {
    this.validateRequired({ problemId }, ["problemId"])

    const cacheKey = `github:config:${problemId}`

    try {
      // Check cache first
      const cached = CacheService.get(cacheKey)
      if (cached) {
        return cached
      }

      this.log(`Fetching config for problem: ${problemId}`)

      const configUrl = `https://raw.githubusercontent.com/WOI-Core/woi-grader-archive/refs/heads/main/Camp2/${problemId}/config.json`

      const response = await fetch(configUrl)
      if (!response.ok) {
        throw new Error(`Config not found: ${response.statusText}`)
      }

      const config = await response.json()

      // Cache the result
      CacheService.set(cacheKey, config)

      this.log(`Retrieved config for ${problemId}`)
      return config
    } catch (error) {
      this.handleError(error, `Failed to fetch config for ${problemId}`)
    }
  }
}

module.exports = new GitHubService()
