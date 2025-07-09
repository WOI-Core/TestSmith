"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Problem {
  id: string;
  name: string;
  description: string;
}

interface Language {
  id: number;
  name: string;
}

export default function ProblemPage() {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [sourceCode, setSourceCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const problemId = searchParams.get('id');
  const { user } = useAuth();

  useEffect(() => {
    if (!problemId) return;

    const fetchProblemAndLanguages = async () => {
      setIsLoading(true);
      try {
        const problemRes = await fetch(`/api/problems/${problemId}`);
        if (!problemRes.ok) {
          throw new Error('Failed to fetch problem details');
        }
        const problemData = await problemRes.json();
        setProblem(problemData);

        const languagesRes = await fetch('/api/languages');
        if (!languagesRes.ok) {
            throw new Error('Failed to fetch languages');
        }
        const languagesData = await languagesRes.json();
        setLanguages(languagesData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblemAndLanguages();
  }, [problemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !problem || !selectedLanguage) {
      setError('Please log in, select a language, and ensure the problem is loaded.');
      return;
    }
    setError(null);
    setSubmissionStatus('Submitting...');

    try {
        const response = await fetch('/api/submissions/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                problemId: problem.id,
                language_id: parseInt(selectedLanguage, 10),
                source_code: sourceCode,
                userId: user.id
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Submission failed');
        }
        setSubmissionStatus('Submission successful!');
    } catch (err: any) {
        setError(err.message);
        setSubmissionStatus(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading problem...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  }

  if (!problem) {
    return <div className="text-center py-10">Problem not found.</div>;
  }

  const fullPdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/problems/${problem.id}/Problems/${problem.id}.pdf`;

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{problem.name}</CardTitle>
          <CardDescription>Problem Statement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[600px]">
             <iframe src={fullPdfUrl} width="100%" height="100%" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Submit Your Solution</CardTitle>
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
                    <SelectItem key={lang.id} value={String(lang.id)}>
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
                className="h-96"
              />
            </div>
            <Button type="submit" className="w-full">Submit</Button>
            {submissionStatus && (
              <Alert>
                <AlertTitle>Submission Status</AlertTitle>
                <AlertDescription>{submissionStatus}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}