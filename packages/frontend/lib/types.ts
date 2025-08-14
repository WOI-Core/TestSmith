export interface Problem {
  id: string;
  name: string;
  statement: string;
  solution: string;
  description: string;
  pdfFileName?: string;
}

export interface Submission {
  id: string;
  status: string;
  test_results: TestResult[];
  total_test_cases: number;
  passed_test_cases: number;
  execution_time: number;
  memory_used: number;
  error_message?: string;
  created_at: string;
}

export interface TestResult {
  test_case: number;
  input: string;
  expected_output: string;
  actual_output: string;
  status: string;
  execution_time: number;
  memory_used: number;
  error?: string;
  judge0_status: string;
} 