import { useState, useCallback } from "react";
import { Problem, Submission } from "@/lib/types";
import { slugifyTaskName } from "@common/utils/slugifyTaskName";

type SubmissionStatus = "submitting" | "polling" | "success" | "error" | null;

export function useProblem(problem: Problem, userId?: string) {
  const [sourceCode, setSourceCode] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("C++");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [status, setStatus] = useState<SubmissionStatus>(null);
  const [error, setError] = useState<string | null>(null);

  const pollSubmission = useCallback(async (submissionId: string) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch submission status.");
      }
      const data: Submission = await res.json();
      setSubmission(data);

      if (
        data.status !== "Processing" &&
        !data.status.includes("Testing case")
      ) {
        setStatus("success");
      } else {
        // Continue polling
        setTimeout(() => pollSubmission(submissionId), 2000);
      }
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }, []);

  const submitCode = useCallback(async () => {
    if (!userId) {
      setError("You must be logged in to submit.");
      return;
    }
    if (!sourceCode.trim()) {
      setError("Source code cannot be empty.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: slugifyTaskName(problem.id),
          language: selectedLanguage,
          sourceCode,
          userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Submission failed.");
      }

      setSubmission(result);
      setStatus("polling");
      pollSubmission(result.id);
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }, [userId, sourceCode, selectedLanguage, problem.id, pollSubmission]);

  return {
    sourceCode,
    setSourceCode,
    selectedLanguage,
    setSelectedLanguage,
    submission,
    status,
    error,
    submitCode,
  };
} 