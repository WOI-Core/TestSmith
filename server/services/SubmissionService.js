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
      // Enhanced fields - will be ignored if database doesn't support them yet
      test_results: [],
      total_test_cases: 0,
      passed_test_cases: 0,
      execution_time: 0,
      memory_used: 0,
      error_message: null
    });

    // Run the judging process in the background and don't wait for it to finish.
    this.judge(submission, submissionData.problemId).catch(error => {
      console.error(`[SubmissionService] Unhandled error in judge process for submission ${submission.id}:`, error);
      // Update submission with error status
      this.submissionRepository.update(submission.id, {
        status: 'Internal Error',
        error_message: error.message
      }).catch(updateError => {
        console.error(`[SubmissionService] Failed to update submission ${submission.id} with error status:`, updateError);
      });
    });

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
    let finalStatus = 'Accepted';
    let testResults = [];
    let totalExecutionTime = 0.0;
    let maxMemoryUsed = 0;
    let errorMessage = null;

    try {
      const testCases = await this.getTestCases(problemId);
      if (testCases.length === 0) {
        throw new Error(`No test cases found for problem: ${problemId}`);
      }

      // Update total test cases count
      await this.submissionRepository.update(submission.id, { 
        total_test_cases: testCases.length,
        test_results: []
      });

      let passedCount = 0;

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          // Update progress
          await this.submissionRepository.update(submission.id, {
            passed_test_cases: passedCount,
            status: `Testing case ${i + 1}/${testCases.length}`
          });

          const judge0Submission = await this.createJudge0Submission(submission, testCase.input);
          const result = await this.getJudge0Result(judge0Submission.token);

          // Debug: Log the raw values from Judge0
          console.log(`[Judge] Test case ${i + 1} - Raw Judge0 values:`, {
            time: result.time,
            memory: result.memory,
            status: result.status
          });

          // Ensure numeric values are properly parsed
          const executionTime = parseFloat(result.time) || 0;
          const memoryUsed = parseFloat(result.memory) || 0;
          
          const testResult = {
            test_case: i + 1,
            input: testCase.input,
            expected_output: testCase.output,
            actual_output: result.stdout || '',
            status: this.getTestCaseStatus(result, testCase.output),
            execution_time: executionTime,
            memory_used: memoryUsed,
            error: result.stderr || null,
            judge0_status: result.status.description || 'Unknown'
          };

          testResults.push(testResult);
          totalExecutionTime += executionTime;
          maxMemoryUsed = Math.max(maxMemoryUsed, memoryUsed);

          if (testResult.status === 'Passed') {
            passedCount++;
          } else {
            finalStatus = 'Wrong Answer';
            errorMessage = `Failed on test case ${i + 1}`;
          }

          // Update test results after each case
          try {
            // Ensure numeric values are properly formatted
            const safeExecutionTime = parseFloat(totalExecutionTime) || 0.0;
            const safeMemoryUsed = parseInt(maxMemoryUsed) || 0;
            
            await this.submissionRepository.update(submission.id, {
              test_results: testResults,
              passed_test_cases: passedCount,
              execution_time: safeExecutionTime,
              memory_used: safeMemoryUsed
            });
          } catch (updateError) {
            console.error(`[Judge] Error updating submission ${submission.id} after test case ${i + 1}:`, updateError);
            // Continue with the next test case even if update fails
          }

        } catch (error) {
          console.error(`[Judge] Error on test case ${i + 1}:`, error);
          testResults.push({
            test_case: i + 1,
            input: testCase.input,
            expected_output: testCase.output,
            actual_output: '',
            status: 'Error',
            execution_time: 0,
            memory_used: 0,
            error: error.message,
            judge0_status: 'Error'
          });
          finalStatus = 'Internal Error';
          errorMessage = `Error on test case ${i + 1}: ${error.message}`;
          break;
        }
      }

      // Final status update
      if (passedCount === testCases.length) {
        finalStatus = 'Accepted';
      } else if (finalStatus === 'Accepted') {
        finalStatus = 'Wrong Answer';
      }

    } catch (error) {
      console.error(`[Judge] Error during judging submission ${submission.id}:`, error);
      finalStatus = 'Internal Error';
      errorMessage = error.message;
    }

    // Final update with complete results
    try {
      // Ensure numeric values are properly formatted
      const safeExecutionTime = parseFloat(totalExecutionTime) || 0.0;
      const safeMemoryUsed = parseInt(maxMemoryUsed) || 0;
      
      await this.submissionRepository.update(submission.id, { 
        status: finalStatus,
        test_results: testResults,
        execution_time: safeExecutionTime,
        memory_used: safeMemoryUsed,
        error_message: errorMessage
      });
    } catch (updateError) {
      console.error(`[Judge] Error in final update for submission ${submission.id}:`, updateError);
      // Try a minimal update with just the status
      try {
        await this.submissionRepository.update(submission.id, { 
          status: finalStatus,
          error_message: errorMessage || updateError.message
        });
      } catch (minimalUpdateError) {
        console.error(`[Judge] Failed even minimal update for submission ${submission.id}:`, minimalUpdateError);
      }
    }
    
    console.log(`[Judge] Submission ${submission.id} finished with status: ${finalStatus} (${passedCount}/${testResults.length} test cases passed)`);
  }

  /**
   * Determines the status of a test case based on Judge0 result and expected output.
   */
  getTestCaseStatus(result, expectedOutput) {
    if (result.status.id === 3) { // Accepted
      const actualOutput = (result.stdout || '').trim();
      const expectedOutputTrimmed = expectedOutput.trim();
      return actualOutput === expectedOutputTrimmed ? 'Passed' : 'Wrong Answer';
    } else if (result.status.id === 4) { // Wrong Answer
      return 'Wrong Answer';
    } else if (result.status.id === 5) { // Time Limit Exceeded
      return 'Time Limit Exceeded';
    } else if (result.status.id === 6) { // Compilation Error
      return 'Compilation Error';
    } else if (result.status.id === 7) { // Runtime Error
      return 'Runtime Error';
    } else if (result.status.id === 8) { // Memory Limit Exceeded
      return 'Memory Limit Exceeded';
    } else {
      return 'Error';
    }
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
    const languageIdMap = { 'C++': 54, 'JavaScript': 63, 'Python': 71, 'Java': 62 };
    const options = {
      method: 'POST',
      url: JUDGE0_API_URL,
      params: { base64_encoded: 'false', wait: 'false' },
      headers: { 'Content-Type': 'application/json' },
      data: {
        language_id: languageIdMap[submission.language] || 54,
        source_code: submission.source_code,
        stdin: stdin,
        cpu_time_limit: 5, // 5 seconds
        memory_limit: 128000, // 128MB
        wall_time_limit: 10 // 10 seconds
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

    let attempts = 0;
    const maxAttempts = 60; // 30 seconds max wait time

    while (attempts < maxAttempts) {
        const response = await axios.request(options);
        if (response.data.status.id > 2) {
            return response.data;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    throw new Error('Judge0 submission timed out');
  }

  /**
   * Retrieves submissions by user ID with enhanced information.
   */
  async getSubmissionsByUserId(userId) {
    return this.submissionRepository.findByUserId(userId);
  }
}

module.exports = SubmissionService;
