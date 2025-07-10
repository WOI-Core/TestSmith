// app/problem/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Problem {
  id: string;
  name: string;
  statement: string;
  solution: string;
  description: string;
  pdfFileName?: string;
}

interface Language {
  id: number;
  name: string;
}

export default function ProblemPage() {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sourceCode, setSourceCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State to hold the interval ID for polling
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  const searchParams = useSearchParams();
  const problemId = searchParams.get("id");
  const { user } = useAuth();

  // Cleanup effect to stop polling if the user navigates away
  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  useEffect(() => {
    if (!problemId) {
      setIsLoading(false);
      setError("No problem ID found in URL.");
      return;
    }

    const fetchProblemData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const problemRes = await fetch(`/api/problems/details-from-storage/${problemId}`);
        if (!problemRes.ok) {
          const errorData = await problemRes.json();
          throw new Error(errorData.message || "Failed to fetch problem details from storage");
        }
        const problemData: Problem = await problemRes.json();
        setProblem(problemData);
        
        const availableLanguages = [
          { id: 1, name: "C++" },
          { id: 2, name: "Java" },
          { id: 3, name: "Python" },
        ];
        setLanguages(availableLanguages);
        setSelectedLanguage(availableLanguages[0].name); 

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblemData();
  }, [problemId]);

  const checkStatus = async (submissionId: string) => {
    try {
        const res = await fetch(`/api/submissions/${submissionId}`);
        if (!res.ok) {
            // Stop polling on error
            if (pollingIntervalId) clearInterval(pollingIntervalId);
            setPollingIntervalId(null);
            setError("Could not retrieve submission status.");
            return;
        }
        const data = await res.json();
        setSubmissionStatus(`Status: ${data.status}`);

        // If the status is no longer processing, stop polling
        if (data.status !== 'Processing' && data.status !== 'In Queue') {
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
    // Clear any existing interval
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    // Start a new interval
    const newIntervalId = setInterval(() => {
      checkStatus(submissionId);
    }, 2000); // Poll every 2 seconds
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

    try {
      const response = await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          language: selectedLanguage,
          sourceCode: sourceCode,
          userId: user.id,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Submission failed due to a server error.");
      }
      setSubmissionStatus(`Submission created! Status: ${result.status}. Now checking for updates...`);
      // Start polling for the final result
      startPolling(result.id); 

    } catch (err: any) {
      setError(err.message);
      setSubmissionStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading problem details...</div>;
  }

  if (!problem) {
    return <div className="text-center py-10 text-red-500">{error || "The requested problem could not be found."}</div>;
  }

  const pdfUrl = problem.pdfFileName
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/problems/${problem.id}/Problems/${problem.pdfFileName}`
    : null;

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{problem.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-[75vh] border rounded-md" title={`${problem.name} PDF`} />
          ) : (
            <div className="w-full h-[75vh] border rounded-md flex items-center justify-center bg-gray-100 text-gray-500">
              PDF Problem Statement Not Found.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit Solution</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Select onValueChange={setSelectedLanguage} value={selectedLanguage}>
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
              <Textarea
                placeholder="Write your code here..."
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="h-96 font-mono"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || pollingIntervalId !== null}>
              {isSubmitting ? "Submitting..." : (pollingIntervalId !== null ? "Judging..." : "Submit")}
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
    </div>
  );
}
