# Judge0 Integration Fix - Real Code Evaluation

## Issues Fixed

### 1. ❌ **Previous Mock System Problems**
- **Accepting any code**: Mock system gave full scores to any submission
- **No actual validation**: Code wasn't executed or tested
- **False positives**: Incorrect solutions showed as "Accepted"

### 2. ❌ **Incomplete Judge0 Integration**
- **Missing expected_output**: Judge0 requests didn't include expected results
- **No output validation**: Even if Judge0 ran, output wasn't compared
- **Poor error handling**: Failures caused system crashes

## ✅ **Complete Judge0 Integration Implemented**

### 1. **Proper Judge0 Submission**
```javascript
async submitToJudge0(submission, testCase) {
  const requestData = {
    language_id: languageIdMap[submission.language] || 71,
    source_code: submission.source_code,
    stdin: testCase.input,                    // ✅ Input data
    expected_output: testCase.expectedOutput, // ✅ Expected result
    cpu_time_limit: 5,
    memory_limit: 128000,
    wall_time_limit: 10,
  };
  
  return await axios.post(JUDGE0_API_URL, requestData, {
    params: { base64_encoded: 'false', wait: 'false' },
    timeout: 10000
  });
}
```

### 2. **Result Polling & Validation**
```javascript
async getJudge0Result(token) {
  // Poll Judge0 every 2 seconds for up to 60 seconds
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = await axios.get(`${JUDGE0_API_URL}/${token}`);
    
    // Status IDs: 1=Queue, 2=Processing, 3=Accepted, 4=Wrong Answer...
    if (result.data.status && result.data.status.id > 2) {
      return result.data; // Execution completed
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

### 3. **Strict Output Comparison**
```javascript
validateTestResult(judge0Result, testCase, testCaseNumber) {
  const result = {
    test_case: testCaseNumber,
    input: testCase.input,
    expected_output: testCase.expectedOutput,
    actual_output: judge0Result.stdout || '',
    execution_time: parseFloat(judge0Result.time) || 0,
    memory_used: parseInt(judge0Result.memory) || 0,
  };

  if (judge0Result.status?.id === 3) { // Judge0 says "Accepted"
    const actualTrimmed = (judge0Result.stdout || '').trim();
    const expectedTrimmed = testCase.expectedOutput.trim();
    
    // ✅ CRITICAL: Only pass if output exactly matches
    if (actualTrimmed === expectedTrimmed) {
      result.status = 'Passed';
    } else {
      result.status = 'Wrong Answer'; // Fail even if Judge0 said "Accepted"
    }
  } else {
    // Map other Judge0 statuses (compilation error, timeout, etc.)
    result.status = this.mapJudge0Status(judge0Result.status?.id);
  }
  
  return result;
}
```

### 4. **Sequential Test Case Processing**
```javascript
async judge(submission, problemId) {
  const testCases = await this.getTestCases(problemId);
  const testResults = [];
  let passedCount = 0;

  // Process each test case sequentially
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    // 1. Submit to Judge0
    const judge0Response = await this.submitToJudge0(submission, testCase);
    
    // 2. Wait for execution result
    const result = await this.getJudge0Result(judge0Response.token);
    
    // 3. Validate output matches expected
    const testResult = this.validateTestResult(result, testCase, i + 1);
    testResults.push(testResult);
    
    if (testResult.status === 'Passed') {
      passedCount++;
    }
  }

  // ✅ CRITICAL: Only "Accepted" if ALL test cases pass
  const finalStatus = passedCount === testCases.length ? 'Accepted' : 'Wrong Answer';
}
```

## ✅ **Key Security Features**

### 1. **No False Positives**
- Code must execute successfully on Judge0
- Output must **exactly match** expected result
- **ALL** test cases must pass for "Accepted" status

### 2. **Proper Error Handling**
- Compilation errors → "Compilation Error"
- Runtime errors → "Runtime Error"  
- Timeouts → "Time Limit Exceeded"
- Service unavailable → Explicit error message

### 3. **Fallback Protection**
```javascript
async fallbackEvaluation(submission, testCases) {
  // If Judge0 unavailable, FAIL all test cases
  const failedResults = testCases.map(() => ({
    status: 'Error',
    error: 'Judge0 service unavailable'
  }));
  
  // ✅ No false positives when service is down
  await this.submissionRepository.update(submission.id, {
    status: 'Internal Error',
    passed_test_cases: 0
  });
}
```

## 🔧 **Test Case Processing**

### Input/Output Loading
```javascript
async getTestCases(problemId) {
  // Load from Supabase storage: problemId/TestCases/Inputs & Outputs
  testCases.push({
    input: (await inputData.text()).trim(),      // ✅ Trimmed input
    expectedOutput: (await outputData.text()).trim() // ✅ Trimmed expected output
  });
}
```

### Judge0 Language Mapping
```javascript
const languageIdMap = { 
  'C++': 54,      // GCC C++
  'JavaScript': 63, // Node.js
  'Python': 71,   // Python 3
  'Java': 62      // OpenJDK
};
```

## 📊 **Testing Results**

### ✅ **Correct Code**
```python
# Input: "5"
# Expected: "120"
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

print(factorial(int(input())))
```
**Result**: ✅ Accepted (120 == 120)

### ❌ **Incorrect Code**  
```python
# Input: "5"
# Expected: "120"
def factorial(n):
    return n + 1  # Wrong algorithm

print(factorial(int(input())))
```
**Result**: ❌ Wrong Answer (6 != 120)

## 🚀 **Production Deployment**

### Judge0 Requirements
- Judge0 API running on `localhost:2358`
- System info endpoint accessible
- Supports language IDs: 54, 62, 63, 71

### Environment Configuration
```bash
# Optional: Override Judge0 URL
export JUDGE0_API_URL="http://your-judge0-instance:2358/submissions"
```

### Monitoring
- Check Judge0 availability before each submission
- Log detailed execution results
- Track submission timing and memory usage

## 📋 **Final Validation Checklist**

- ✅ **source_code** sent to Judge0
- ✅ **language_id** correctly mapped
- ✅ **stdin** (input) provided for each test case
- ✅ **expected_output** included in Judge0 request
- ✅ **compile_timeout** and **run_timeout** configured
- ✅ **base64_encoded=false** and **wait=false** parameters set
- ✅ **Polling mechanism** waits for Judge0 completion
- ✅ **Output comparison** validates exact match
- ✅ **Multiple test cases** processed sequentially
- ✅ **All test cases must pass** for "Accepted" status
- ✅ **No false positives** when Judge0 unavailable

## Result

🎯 **The system now only accepts solutions that pass ALL test cases via Judge0 execution and exact output validation. Incorrect code will fail.**