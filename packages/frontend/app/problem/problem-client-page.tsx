"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { slugifyTaskName } from "common";
import { Problem, Submission } from "@/lib/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

interface Language {
  id: number;
  name: string;
}

interface ProblemClientPageProps {
  problem: Problem;
}

export default function ProblemClientPage({ problem }: ProblemClientPageProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sourceCode, setSourceCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollingIntervalId, setPollingIntervalId] =
    useState<NodeJS.Timeout | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  useEffect(() => {
    const availableLanguages = [
      { id: 1, name: "C++" },
      { id: 2, name: "Java" },
      { id: 3, name: "Python" },
    ];
    setLanguages(availableLanguages);
    setSelectedLanguage(availableLanguages[0].name);
  }, []);

  const checkStatus = async (submissionId: string) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (!res.ok) {
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setError("Could not retrieve submission status.");
        return;
      }
      const data: Submission = await res.json();
      setCurrentSubmission(data);

      if (data.status === "Accepted") {
        setSubmissionStatus(
          `✅ Accepted! (${data.passed_test_cases}/${data.total_test_cases} test cases passed)`,
        );
      } else if (data.status === "Wrong Answer") {
        setSubmissionStatus(
          `❌ Wrong Answer (${data.passed_test_cases}/${data.total_test_cases} test cases passed)`,
        );
      } else if (
        data.status === "Processing" ||
        data.status === "Running" ||
        data.status.includes("Testing case")
      ) {
        setSubmissionStatus(
          `🔄 ${data.status} (${data.passed_test_cases || 0}/${data.total_test_cases || 0} passed so far)`,
        );
      } else if (data.status === "Internal Error") {
        setSubmissionStatus(`❌ Internal Error: ${data.error_message || 'An internal error occurred'}`);
      } else if (data.status === "Compilation Error") {
        setSubmissionStatus(`❌ Compilation Error: ${data.error_message || 'Code failed to compile'}`);
      } else if (data.status === "Time Limit Exceeded") {
        setSubmissionStatus(`⏰ Time Limit Exceeded (${data.passed_test_cases || 0}/${data.total_test_cases || 0} passed)`);
      } else if (data.status === "Memory Limit Exceeded") {
        setSubmissionStatus(`💾 Memory Limit Exceeded (${data.passed_test_cases || 0}/${data.total_test_cases || 0} passed)`);
      } else {
        setSubmissionStatus(`Status: ${data.status}`);
      }

      const isProcessing = data.status === "Processing" || 
                         data.status === "Running" || 
                         data.status.includes("Testing case");
      
      if (!isProcessing) {
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
      }
    } catch (err) {
      setError("Failed to check submission status.");
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  };

  const startPolling = (submissionId: string) => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    const newIntervalId = setInterval(() => {
      checkStatus(submissionId);
    }, 2000);
    setPollingIntervalId(newIntervalId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceCode.trim()) {
      setError("Source code cannot be empty.");
      return;
    }
    if (!user || !problem || !selectedLanguage) {
      setError("Please log in and select a language.");
      return;
    }

    setError(null);
    setSubmissionStatus("Submitting...");
    setIsSubmitting(true);
    setCurrentSubmission(null);

    try {
      const response = await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: slugifyTaskName(problem.id),
          language: selectedLanguage,
          sourceCode: sourceCode,
          userId: user.id,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.message || "Submission failed due to a server error.",
        );
      }
      setSubmissionStatus(
        `Submission created! Status: ${result.status}. Now checking for updates...`,
      );
      startPolling(result.id);
    } catch (err: any) {
      setError(err.message);
      setSubmissionStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Wrong Answer":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "Time Limit Exceeded":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "Compilation Error":
      case "Runtime Error":
      case "Memory Limit Exceeded":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted":
        return "bg-green-100 text-green-800";
      case "Wrong Answer":
        return "bg-red-100 text-red-800";
      case "Time Limit Exceeded":
        return "bg-orange-100 text-orange-800";
      case "Compilation Error":
      case "Runtime Error":
      case "Memory Limit Exceeded":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const languageMap: Record<string, string> = {
    "C++": "cpp",
    Python: "python",
    Java: "java",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit Solution</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Select
                onValueChange={setSelectedLanguage}
                value={selectedLanguage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.id} value={lang.name}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <MonacoEditor
                height="400px"
                language={languageMap[selectedLanguage] || "plaintext"}
                theme="vs-dark"
                value={sourceCode}
                onChange={(value) => setSourceCode(value || "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || pollingIntervalId !== null}
            >
              {isSubmitting
                ? "Submitting..."
                : pollingIntervalId !== null
                  ? "Judging..."
                  : "Submit"}
            </Button>
            {submissionStatus && !error && (
              <Alert variant="default">
                <AlertTitle>Status</AlertTitle>
                <AlertDescription>{submissionStatus}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {currentSubmission && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(currentSubmission.status)}
              Evaluation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(currentSubmission.status)}>
                {currentSubmission.status}
              </Badge>
              <div className="text-sm text-gray-600">
                {currentSubmission.passed_test_cases}/
                {currentSubmission.total_test_cases} test cases passed
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Test Cases Progress</span>
                <span>
                  {Math.round(
                    (currentSubmission.passed_test_cases /
                      currentSubmission.total_test_cases) *
                      100,
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  (currentSubmission.passed_test_cases /
                    currentSubmission.total_test_cases) *
                  100
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-medium">Execution Time</div>
                <div className="text-gray-600">
                  {currentSubmission.execution_time.toFixed(3)}s
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-medium">Memory Used</div>
                <div className="text-gray-600">
                  {(currentSubmission.memory_used / 1024).toFixed(1)}MB
                </div>
              </div>
            </div>

            {currentSubmission.error_message && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {currentSubmission.error_message}
                </AlertDescription>
              </Alert>
            )}

            {currentSubmission.test_results &&
              currentSubmission.test_results.length > 0 && (
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="details">Test Cases</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="space-y-2">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Passed:</span>
                        <span className="text-green-600">
                          {
                            currentSubmission.test_results.filter(
                              (t) => t.status === "Passed",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <span className="text-red-600">
                          {
                            currentSubmission.test_results.filter(
                              (t) => t.status !== "Passed",
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="details"
                    className="space-y-2 max-h-64 overflow-y-auto"
                  >
                    {currentSubmission.test_results.map((test, index) => (
                      <div key={index} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Test Case {test.test_case}
                          </span>
                          <Badge
                            className={
                              test.status === "Passed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {test.status}
                          </Badge>
                        </div>
                        {test.status !== "Passed" && (
                          <div className="text-xs space-y-1">
                            <div>
                              <strong>Input:</strong>{" "}
                              <code className="bg-gray-100 px-1 rounded">
                                {test.input}
                              </code>
                            </div>
                            <div>
                              <strong>Expected:</strong>{" "}
                              <code className="bg-gray-100 px-1 rounded">
                                {test.expected_output}
                              </code>
                            </div>
                            <div>
                              <strong>Actual:</strong>{" "}
                              <code className="bg-gray-100 px-1 rounded">
                                {test.actual_output}
                              </code>
                            </div>
                            {test.error && (
                              <div>
                                <strong>Error:</strong>{" "}
                                <code className="bg-red-100 px-1 rounded text-red-800">
                                  {test.error}
                                </code>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-600">
                          Time: {test.execution_time.toFixed(3)}s | Memory:{" "}
                          {(test.memory_used / 1024).toFixed(1)}MB
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 