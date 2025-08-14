/**
 * Judge0 Service
 * Handles code evaluation using Judge0 API
 */
const fetch = require("node-fetch")
const BaseService = require("./BaseService")
const config = require("../config")

class Judge0Service extends BaseService {
  constructor() {
    super("Judge0Service")
    this.apiUrl = config.services.judge0.url
  }

  /**
   * Evaluate submission against test cases
   */
  async evaluateSubmission({ language_id, source_code, testCases, config: problemConfig }) {
    try {
      this.log(`Evaluating submission with ${testCases.length} test cases`)

      // Prepare submission configuration
      const cpu_time_limit = problemConfig.timeLimit ? Number(problemConfig.timeLimit) / 1000 : 2
      const memory_limit = problemConfig.memoryLimit ? Number(problemConfig.memoryLimit) * 1024 : 128000
      const wall_time_limit = 20

      // Create batch submission
      const submissions = testCases.map((tc) => ({
        language_id,
        source_code: Buffer.from(source_code).toString("base64"),
        stdin: Buffer.from(tc.input).toString("base64"),
        expected_output: tc.expectedOutput ? Buffer.from(tc.expectedOutput).toString("base64") : null,
        cpu_time_limit,
        wall_time_limit,
        memory_limit,
      }))

      // Submit to Judge0
      const tokenResponse = await fetch(`${this.apiUrl}/submissions/batch?base64_encoded=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissions }),
      })

      if (!tokenResponse.ok) {
        throw new Error("Failed to create batch submission on Judge0")
      }

      const tokens = await tokenResponse.json()
      const tokenString = tokens.map((t) => t.token).join(",")

      // Poll for results
      let finalResults
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const resultResponse = await fetch(
          `${this.apiUrl}/submissions/batch?tokens=${tokenString}&base64_encoded=true&fields=*`,
        )

        const data = await resultResponse.json()

        if (data.submissions && data.submissions.every((s) => s.status.id > 2)) {
          finalResults = data.submissions
          break
        }
      }

      if (!finalResults) {
        throw new Error("Timed out waiting for judge verdicts")
      }

      this.log(`Evaluation completed: ${finalResults.length} results`)
      return finalResults
    } catch (error) {
      this.handleError(error, "Failed to evaluate submission")
    }
  }
}

module.exports = new Judge0Service()
