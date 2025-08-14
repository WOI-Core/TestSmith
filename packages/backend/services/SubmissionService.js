const axios = require('axios');

// The URL for Judge0 instance - check if there's a local instance running
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358/submissions';

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
    try {
      const testCases = await this.getTestCases(problemId);
      if (testCases.length === 0) {
        throw new Error(`No test cases found for problem: ${problemId}`);
      }

      // Update submission with test case count
      await this.submissionRepository.update(submission.id, {
        total_test_cases: testCases.length,
        status: 'Running'
      });

      console.log(`[Judge] Starting evaluation of submission ${submission.id} with ${testCases.length} test cases`);

      // Check if Judge0 is available
      const isJudge0Available = await this.checkJudge0Availability();
      
      if (!isJudge0Available) {
        console.warn(`[Judge] Judge0 not available, using fallback evaluation for submission ${submission.id}`);
        await this.fallbackEvaluation(submission, testCases);
        return;
      }

      // Submit all test cases to Judge0 using webhooks for results
      const tokens = [];
      let submissionErrors = [];
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`[Judge] Submitting test case ${i + 1}/${testCases.length} for submission ${submission.id}`);
        
        try {
          // Submit to Judge0 with webhook callback
          const judge0Response = await this.submitToJudge0(submission, testCase);
          
          if (!judge0Response.token) {
            throw new Error('Judge0 did not return a token');
          }
          
          // Store token mapping for webhook processing
          await this.storeTokenMapping(judge0Response.token, submission.id, i + 1, testCase);
          tokens.push(judge0Response.token);
          
          console.log(`[Judge] Submitted test case ${i + 1} with token: ${judge0Response.token}`);

        } catch (testError) {
          console.error(`[Judge] Error submitting test case ${i + 1}:`, testError);
          submissionErrors.push(`Test case ${i + 1}: ${testError.message}`);
          
          // Create error result immediately
          const errorResult = {
            test_case: i + 1,
            input: testCase.input,
            expected_output: testCase.expectedOutput,
            actual_output: '',
            status: 'Error',
            execution_time: 0,
            memory_used: 0,
            error: testError.message,
            judge0_status: 'Submission Error'
          };

          await this.processTestResult(submission.id, errorResult);
        }
      }

      // If no test cases were successfully submitted, mark as error
      if (tokens.length === 0) {
        throw new Error(`Failed to submit any test cases: ${submissionErrors.join('; ')}`);
      }
      
      // If some test cases failed to submit, log warning
      if (submissionErrors.length > 0) {
        console.warn(`[Judge] ${submissionErrors.length} test cases failed to submit for submission ${submission.id}`);
      }

      console.log(`[Judge] Submitted ${tokens.length} test cases for submission ${submission.id}. Results will be processed via webhooks.`);

      // Update status to indicate we're waiting for results
      await this.submissionRepository.update(submission.id, {
        status: `Testing case 0/${testCases.length}`,
        passed_test_cases: 0
      });

    } catch (error) {
      console.error(`[Judge] Error during judging submission ${submission.id}:`, error);
      try {
        await this.submissionRepository.update(submission.id, {
          status: 'Internal Error',
          error_message: error.message,
        });
      } catch (updateError) {
        console.error(`[Judge] Failed to update submission ${submission.id} with error status:`, updateError);
      }
    }
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
          input: (await inputData.text()).trim(),
          expectedOutput: (await outputData.text()).trim(),
        });
      }
    }
    return testCases;
  }

  /**
   * Check if Judge0 API is available
   */
  async checkJudge0Availability() {
    try {
      const response = await axios.get(JUDGE0_API_URL.replace('/submissions', '/system_info'), {
        timeout: 3000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('[Judge] Judge0 not available:', error.message);
      return false;
    }
  }

  /**
   * Submit a single test case to Judge0
   * @param {object} submission - Our internal submission record
   * @param {object} testCase - Test case with input and expectedOutput
   */
  async submitToJudge0(submission, testCase) {
    const languageIdMap = { 
      'C++': 54, 
      'JavaScript': 63, 
      'Python': 71, 
      'Java': 62 
    };

    // Create a callback URL for webhook notifications
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const callbackUrl = `${baseUrl}/api/webhooks/judge0`;

    const requestData = {
      language_id: languageIdMap[submission.language] || 71, // Default to Python
      source_code: Buffer.from(submission.source_code).toString('base64'),
      stdin: Buffer.from(testCase.input).toString('base64'),
      expected_output: Buffer.from(testCase.expectedOutput).toString('base64'),
      cpu_time_limit: 5,
      memory_limit: 128000, // 128MB in KB
      wall_time_limit: 10,
      callback_url: callbackUrl,
    };

    console.log(`[Judge] Submitting to Judge0:`, {
      language_id: requestData.language_id,
      stdin_length: testCase.input.length,
      expected_output_length: testCase.expectedOutput.length,
      source_code_length: submission.source_code.length,
      callback_url: callbackUrl
    });

    try {
      const response = await axios.post(JUDGE0_API_URL, requestData, {
        params: { base64_encoded: 'true', wait: 'false' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      console.log(`[Judge] Judge0 response:`, response.data);
      return response.data;
    } catch (error) {
      console.error('[Judge] Judge0 submission error:', error.response?.data || error.message);
      throw new Error(`Judge0 submission failed: ${error.message}`);
    }
  }

  /**
   * Poll Judge0 for result using token
   * @param {string} token - Judge0 submission token
   */
  async getJudge0Result(token) {
    const maxAttempts = 30; // 30 attempts = 60 seconds max
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${JUDGE0_API_URL}/${token}`, {
          params: { base64_encoded: 'true', fields: '*' },
          timeout: 5000
        });

        const result = response.data;
        console.log(`[Judge] Polling attempt ${attempt + 1}: status_id=${result.status?.id}, description=${result.status?.description}`);

        // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, 5=Time Limit Exceeded, etc.
        if (result.status && result.status.id > 2) {
          // Decode base64 encoded fields
          if (result.stdout) {
            result.stdout = Buffer.from(result.stdout, 'base64').toString('utf-8');
          }
          if (result.stderr) {
            result.stderr = Buffer.from(result.stderr, 'base64').toString('utf-8');
          }
          if (result.compile_output) {
            result.compile_output = Buffer.from(result.compile_output, 'base64').toString('utf-8');
          }
          return result;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`[Judge] Polling error on attempt ${attempt + 1}:`, error.message);
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error('Judge0 result polling timeout');
  }

  /**
   * Validate Judge0 result against expected output
   * @param {object} judge0Result - Result from Judge0
   * @param {object} testCase - Original test case
   * @param {number} testCaseNumber - Test case number for display
   */
  validateTestResult(judge0Result, testCase, testCaseNumber) {
    const result = {
      test_case: testCaseNumber,
      input: testCase.input,
      expected_output: testCase.expectedOutput,
      actual_output: judge0Result.stdout || '',
      status: 'Error',
      execution_time: parseFloat(judge0Result.time) || 0,
      memory_used: parseInt(judge0Result.memory) || 0,
      error: judge0Result.stderr || null,
      judge0_status: judge0Result.status?.description || 'Unknown'
    };

    // Check Judge0 status first
    if (judge0Result.status?.id === 3) { // Accepted
      // Now compare actual output with expected output
      const actualTrimmed = (judge0Result.stdout || '').trim();
      const expectedTrimmed = testCase.expectedOutput.trim();
      
      if (actualTrimmed === expectedTrimmed) {
        result.status = 'Passed';
      } else {
        result.status = 'Wrong Answer';
        console.log(`[Judge] Output mismatch in test case ${testCaseNumber}:`);
        console.log(`Expected: "${expectedTrimmed}"`);
        console.log(`Actual: "${actualTrimmed}"`);
      }
    } else {
      // Map Judge0 status to our status
      switch (judge0Result.status?.id) {
        case 4:
          result.status = 'Wrong Answer';
          break;
        case 5:
          result.status = 'Time Limit Exceeded';
          break;
        case 6:
          result.status = 'Compilation Error';
          break;
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
          result.status = 'Runtime Error';
          break;
        default:
          result.status = 'Error';
      }
    }

    return result;
  }

  /**
   * Fallback evaluation when Judge0 is not available
   * Creates failing results to ensure no false positives
   */
  async fallbackEvaluation(submission, testCases) {
    const failedResults = testCases.map((testCase, index) => ({
      test_case: index + 1,
      input: testCase.input,
      expected_output: testCase.expectedOutput,
      actual_output: '',
      status: 'Error',
      execution_time: 0,
      memory_used: 0,
      error: 'Judge0 service unavailable',
      judge0_status: 'Service Unavailable'
    }));

    await this.submissionRepository.update(submission.id, {
      status: 'Internal Error',
      test_results: failedResults,
      passed_test_cases: 0,
      execution_time: 0,
      memory_used: 0,
      error_message: 'Code evaluation service is currently unavailable. Please try again later.'
    });
  }

  /**
   * Retrieves submissions by user ID with enhanced information.
   */
  async getSubmissionsByUserId(userId) {
    return this.submissionRepository.findByUserId(userId);
  }

  /**
   * Store token mapping for webhook processing
   */
  async storeTokenMapping(token, submissionId, testCaseNumber, testCase) {
    try {
      // For now, store in memory. In production, use a database table.
      if (!global.tokenMappings) {
        global.tokenMappings = new Map();
      }
      
      global.tokenMappings.set(token, {
        submissionId,
        testCaseNumber,
        testCase,
        timestamp: Date.now()
      });
      
      console.log(`[Judge] Stored token mapping: ${token} -> submission ${submissionId}, test case ${testCaseNumber}`);
    } catch (error) {
      console.error('[Judge] Error storing token mapping:', error);
      throw error;
    }
  }

  /**
   * Process individual test result from webhook
   */
  async processTestResult(submissionId, testResult) {
    try {
      const submission = await this.submissionRepository.getById(submissionId);
      if (!submission) {
        throw new Error(`Submission ${submissionId} not found`);
      }

      // Get current test results
      const currentResults = submission.test_results || [];
      
      // Add/update this test result
      const existingIndex = currentResults.findIndex(r => r.test_case === testResult.test_case);
      if (existingIndex >= 0) {
        currentResults[existingIndex] = testResult;
      } else {
        currentResults.push(testResult);
      }

      // Sort by test case number
      currentResults.sort((a, b) => a.test_case - b.test_case);

      // Calculate progress
      const passedCount = currentResults.filter(r => r.status === 'Passed').length;
      const totalCount = submission.total_test_cases || currentResults.length;
      const completedCount = currentResults.length;

      // Determine status
      let status;
      if (completedCount < totalCount) {
        status = `Testing case ${completedCount}/${totalCount}`;
      } else {
        // All test cases completed
        status = passedCount === totalCount ? 'Accepted' : 'Wrong Answer';
      }

      // Calculate max execution time and memory
      const maxExecutionTime = Math.max(...currentResults.map(r => r.execution_time || 0));
      const maxMemoryUsed = Math.max(...currentResults.map(r => r.memory_used || 0));

      // Update submission
      await this.submissionRepository.update(submissionId, {
        status,
        test_results: currentResults,
        passed_test_cases: passedCount,
        execution_time: maxExecutionTime,
        memory_used: maxMemoryUsed,
        error_message: status === 'Accepted' ? null : `Failed ${totalCount - passedCount} out of ${totalCount} test cases`
      });

      console.log(`[Judge] Updated submission ${submissionId}: ${status} (${passedCount}/${totalCount} passed)`);
      
    } catch (error) {
      console.error('[Judge] Error processing test result:', error);
      throw error;
    }
  }

  async updateSubmissionFromWebhook(token, data) {
    try {
      // Get token mapping
      if (!global.tokenMappings) {
        global.tokenMappings = new Map();
      }
      
      const mapping = global.tokenMappings.get(token);
      if (!mapping) {
        throw new Error(`Token mapping not found for ${token}`);
      }

      const { submissionId, testCaseNumber, testCase } = mapping;
      const { stdout, stderr, compile_output, status, time, memory, message } = data;

      console.log(`[Webhook] Processing result for submission ${submissionId}, test case ${testCaseNumber}`);

      // Create test result
      const testResult = {
        test_case: testCaseNumber,
        input: testCase.input,
        expected_output: testCase.expectedOutput,
        actual_output: stdout || '',
        status: this.getTestCaseStatus(data, testCase.expectedOutput),
        execution_time: time || 0,
        memory_used: memory || 0,
        error: stderr || compile_output || message || null,
        judge0_status: status ? status.description : 'Unknown',
      };

      // Process the test result
      await this.processTestResult(submissionId, testResult);

      // Clean up token mapping
      global.tokenMappings.delete(token);
      
    } catch (error) {
      console.error('[Webhook] Error updating submission from webhook:', error);
      throw error;
    }
  }
}

module.exports = SubmissionService;
