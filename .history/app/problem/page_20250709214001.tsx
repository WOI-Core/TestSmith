"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
// ... other imports

interface Problem {
  id: string;
  name: string;
  description: string;
  difficulty: number;
}

export default function ProblemPage() {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const problemId = params.problemId as string;

  useEffect(() => {
    if (!problemId) return;

    const fetchProblem = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/problems/${problemId}`);
        if (!res.ok) {
          throw new Error('Problem not found');
        }
        const data = await res.json();
        setProblem(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  if (isLoading) {
    return <div className="text-center py-10">Loading problem...</div>;
  }

  if (error || !problem) {
    return <div className="text-red-500 text-center py-10">Error: Problem not found.</div>;
  }

  const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/problems/${problem.id}/Problems/${problem.id}.pdf`;

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{problem.name}</h1>
          <p className="text-lg text-gray-600 mb-4">{problem.description}</p>
          <iframe src={pdfUrl} className="w-full h-[70vh] rounded-md border" />
        </div>
        <div>
          {/* Submission form would go here */}
        </div>
      </div>
    </div>
  );
}