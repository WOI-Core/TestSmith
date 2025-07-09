"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

  const params = useParams();
  const problemId = params.problemId as string;
  const { user } = useAuth();

  useEffect(() => {
    if (!problemId) {
      setIsLoading(false);
      return;
    }

    const fetchProblemData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const problemRes = await fetch(`http://localhost:3001/api/problems/${problemId}`);
        
        if (!problemRes.ok) {
          const errorData = await problemRes.json();
          throw new Error(errorData.message || 'Failed to fetch problem details');
        }

        const problemData = await problemRes.json();
        setProblem(problemData);
        
        // Using a static list for languages for now
        setLanguages([
            { id: 1, name: 'C++' },
            { id: 2, name: 'Java' },
            { id: 3, name: 'Python' }
        ]);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblemData();
  }, [problemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !problem || !selectedLanguage) {
      setError('Please log in and select a language.');
      return;
    }
    setError(null);
    setSubmissionStatus('Submitting...');

    try {
        const response = await fetch('http://localhost:3001/api/submissions/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                problemId: problem.id,
                language: selectedLanguage,
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
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error || !problem) {
    return <div className="text-center py-10 text-red-500">{error || 'Problem not found'}</div>;
  }

  const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/problems/${problem.id}/Problems/${problem.id}.pdf`;

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card>
        <CardHeader><CardTitle>{problem.name}</CardTitle></CardHeader>
        <CardContent>
          <iframe src={pdfUrl} className="w-full h-[75vh] border rounded-md" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Submit Solution</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Select onValueChange={setSelectedLanguage} value={selectedLanguage}>
                  <SelectTrigger><SelectValue placeholder="Select Language" /></SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (<SelectItem key={lang.id} value={lang.name}>{lang.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Textarea placeholder="Write your code here..." value={sourceCode} onChange={(e) => setSourceCode(e.target.value)} className="h-96 font-mono"/>
            </div>
            <Button type="submit" className="w-full">Submit</Button>
            {submissionStatus && (<Alert><AlertTitle>Status</AlertTitle><AlertDescription>{submissionStatus}</AlertDescription></Alert>)}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}