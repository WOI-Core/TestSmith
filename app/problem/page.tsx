"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

function ProblemComponent() {
  const searchParams = useSearchParams();
  const problemId = searchParams.get('id');
  const { user } = useAuth();

  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('71'); // 71 for Python
  const [results, setResults] = useState<any[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (problemId) {
      const fetchProblem = async () => {
        try {
          const res = await fetch(`/api/problems/${problemId}/config`);
          if (!res.ok) throw new Error('Problem not found');
          const data = await res.json();
          setProblem(data.data);
        } catch (error: any) {
          setError(error.message);
        }
      };
      fetchProblem();
    }
  }, [problemId]);

  const handleSubmit = async () => {
    if (!user) {
      alert('Please login to submit your solution.');
      return;
    }
    setSubmitting(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch('/api/submissions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language_id: language,
          source_code: code,
          userId: user.userId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResults(data.data.results);
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!problemId) return <div className="p-8 text-center">No problem selected.</div>;
  if (error) return <div className="p-8 text-center text-error-color">Error: {error}</div>;
  if (!problem) return <div className="p-8 text-center">Loading problem...</div>;

  const pdfUrl = `https://docs.google.com/gview?url=https://raw.githubusercontent.com/WOI-Core/woi-grader-archive/main/Camp2/${problemId}/Problems/${problemId}.pdf&embedded=true`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 max-w-screen-2xl mx-auto">
      {/* Left side: Problem statement */}
      <div className="flex flex-col gap-4">
        <div className="problem-header p-4 bg-card-bg rounded-lg shadow-md">
          <h1 className="text-2xl font-bold">{problem.title || problemId}</h1>
          <div className="flex gap-4 mt-2 text-sm text-text-secondary">
            <span>Time Limit: {problem.timeLimit || 'N/A'} ms</span>
            <span>Memory Limit: {problem.memoryLimit || 'N/A'} MB</span>
          </div>
        </div>
        <div className="pdf-container flex-grow rounded-lg shadow-md overflow-hidden bg-white">
          <iframe src={pdfUrl} className="w-full h-[80vh] border-0" title="Problem Statement"></iframe>
        </div>
      </div>

      {/* Right side: Code editor and results */}
      <div className="flex flex-col gap-4">
        <div className="editor-card bg-card-bg rounded-lg shadow-md flex-grow flex flex-col">
          <div className="p-4 border-b border-border-color flex justify-between items-center">
            <h3 className="text-lg font-semibold">Your Solution</h3>
            <select value={language} onChange={e => setLanguage(e.target.value)} className="p-2 bg-input-bg rounded-md border border-border-color">
              <option value="71">Python (3.8.1)</option>
              <option value="54">C++ (GCC 9.2.0)</option>
            </select>
          </div>
          <div className="editor-container flex-grow bg-[#1e1e1e]">
            <textarea
              className="w-full h-full bg-transparent text-white p-4 font-mono resize-none outline-none"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Write your code here..."
              style={{ minHeight: '400px' }}
            />
          </div>
          <div className="p-4 border-t border-border-color">
            <button onClick={handleSubmit} disabled={submitting} className="w-full p-3 bg-success-color text-white rounded-md font-bold disabled:bg-gray-500 hover:bg-success-hover transition-colors">
              {submitting ? 'Submitting...' : 'Submit Solution'}
            </button>
          </div>
        </div>

        {results && (
          <div className="results-card bg-card-bg rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold mb-2">Submission Results</h3>
            <div className="flex flex-col gap-2">
              {results.map((result, index) => (
                <div key={index} className={`p-3 rounded-md ${result.status.description === 'Accepted' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Test Case #{index + 1}</span>
                    <span className={`font-bold ${result.status.description === 'Accepted' ? 'text-success-color' : 'text-error-color'}`}>{result.status.description}</span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    <span>Time: {result.time}s</span> | <span>Memory: {result.memory}KB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap the component in Suspense because useSearchParams must be used in a client component wrapped in Suspense
export default function ProblemPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProblemComponent />
        </Suspense>
    )
}
