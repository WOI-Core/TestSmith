const axios = require('axios');

// The URL for your locally hosted Judge0 instance.
const JUDGE0_API_URL = 'http://localhost:2358/submissions';

class SubmissionService {
  constructor(submissionRepository, supabase) {
    this.submissionRepository = submissionRepository;
    this.supabase = supabase; // We need the Supabase client to access Storage

    if (!this.submissionRepository) {
      throw new Error("SubmissionService: submissionRepository is undefined.");
    }
    if (!this.supabase) {
        throw new Error("SubmissionService: supabase client is undefined.");
    }
  }

  /**
   * The main orchestrator method for handling a new code submission.
   * @param {object} submissionData - Contains userId, problemId, language, sourceCode.
   */
  async submit(submissionData) {
    // 1. Create an initial submission record in the database with "Processing" status.
    const submission = await this.submissionRepository.create({
      ...submissionData,
      status: 'Processing',
    });

    // Run the judging process in the background and don't wait for it to finish.
    this.judge(submission, submissionData.problemId);

    // Return the initial submission record to the user immediately.
    return submission;
  }

  /**
   * Retrieves a single submission by its ID.
   * This method was missing and is required for the frontend polling to work.
   * @param {string} submissionId - The ID of the submission to fetch.
   * @returns {Promise<object|null>} The submission object.
   */
  async getSubmissionById(submissionId) {
    // This simply acts as a pass-through to the repository layer.
    return this.submissionRepository.findById(submissionId);
  }

  /**
   * Handles the entire judging process for a submission.
   * @param {object} submission - The submission record from the database.
   * @param {string} problemId - The identifier for the problem (e.g., 'FibonacciSequence').
   */
  async judge(submission, problemId) {
    let finalStatus = 'Accepted'; // Assume success unless a test case fails

    try {
      const testCases = await this.getTestCases(problemId);
      if (testCases.length === 0) {
        throw new Error(`No test cases found for problem: ${problemId}`);
      }

      for (const testCase of testCases) {
        const judge0Submission = await this.createJudge0Submission(submission, testCase.input);
        const result = await this.getJudge0Result(judge0Submission.token);

        if (result.status.id !== 3 || (result.stdout || '').trim() !== testCase.output.trim()) {
          finalStatus = 'Wrong Answer';
          break;
        }
      }
    } catch (error) {
      console.error(`[Judge] Error during judging submission ${submission.id}:`, error);
      finalStatus = 'Internal Error';
    }

    await this.submissionRepository.update(submission.id, { status: finalStatus });
    console.log(`[Judge] Submission ${submission.id} finished with status: ${finalStatus}`);
  }

  /**
   * Fetches test case input/output pairs from Supabase Storage.
   * @param {string} problemId - The folder name of the problem.
   */
  async getTestCases(problemId) {
    const testCases = [];
    const pathPrefix = `${problemId}/TestCases`;
    const { data: inputFiles, error: inputError } = await this.supabase.storage.from('problems').list(`${pathPrefix}/Inputs`);
    const { data: outputFiles, error: outputError } = await this.supabase.storage.from('problems').list(`${pathPrefix}/Outputs`);

    if (inputError || outputError) {
      throw new Error('Failed to list test case files in storage.');
    }

    for (const inputFile of inputFiles) {
      const correspondingOutput = outputFiles.find(f => f.name.replace('output', '') === inputFile.name.replace('input', ''));
      if (correspondingOutput) {
        const { data: inputData } = await this.supabase.storage.from('problems').download(`${pathPrefix}/Inputs/${inputFile.name}`);
        const { data: outputData } = await this.supabase.storage.from('problems').download(`${pathPrefix}/Outputs/${correspondingOutput.name}`);
        
        testCases.push({
          input: await inputData.text(),
          output: await outputData.text(),
        });
      }
    }
    return testCases;
  }

  /**
   * Creates a submission on the local Judge0 API.
   * @param {object} submission - Our internal submission record.
   * @param {string} stdin - The standard input for the test case.
   */
  async createJudge0Submission(submission, stdin) {
    const languageIdMap = { 'C++': 54, 'JavaScript': 63, 'Python': 71 };
    const options = {
      method: 'POST',
      url: JUDGE0_API_URL,
      params: { base64_encoded: 'false', wait: 'false' },
      headers: { 'Content-Type': 'application/json' },
      data: {
        language_id: languageIdMap[submission.language] || 54,
        source_code: submission.source_code,
        stdin: stdin
      }
    };
    const response = await axios.request(options);
    return response.data;
  }

  /**
   * Polls local Judge0 for the result of a submission.
   * @param {string} token - The submission token from Judge0.
   */
  async getJudge0Result(token) {
    const options = {
        method: 'GET',
        url: `${JUDGE0_API_URL}/${token}`,
        params: { base64_encoded: 'false', fields: '*' },
    };

    while (true) {
        const response = await axios.request(options);
        if (response.data.status.id > 2) {
            return response.data;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
}

module.exports = SubmissionService;
