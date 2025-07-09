"use client";

import React from 'react';
import Link from 'next/link';

// This is the component for your Home Page (app/page.tsx)
export default function HomePage() {
  const [problems, setProblems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // This function fetches the list of problems from your backend API
    const fetchProblems = async () => {
      try {
        // The API endpoint is based on your server setup
        const res = await fetch('/api/problems/list');
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch problems');
        }
        const data = await res.json();
        // We filter for directories, as specified in your original code
        setProblems(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, []);

  // This function injects the necessary CSS variables for styling
  const StyleInjector = () => {
    const style = `
      :root {
        --bg-primary: #f8fafc; --bg-secondary: #ffffff; --bg-tertiary: #f1f5f9; --card-bg: #ffffff; --header-bg: #f8fafc; --input-bg: #f1f5f9; --border-color: #e2e8f0; --border-hover: #cbd5e1; --text-primary: #1e293b; --text-secondary: #64748b; --text-muted: #94a3b8; --accent-color: #3b82f6; --accent-hover: #2563eb; --success-color: #22c55e; --success-hover: #16a34a; --error-color: #ef4444; --warning-color: #f59e0b; --info-color: #3b82f6; --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); --card-shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      body.dark-mode {
        --bg-primary: #0f172a; --bg-secondary: #1e293b; --bg-tertiary: #334155; --card-bg: #1e293b; --header-bg: #0f172a; --input-bg: #334155; --border-color: #475569; --border-hover: #64748b; --text-primary: #f1f5f9; --text-secondary: #cbd5e1; --text-muted: #64748b; --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2); --card-shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
      }
      body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
      }
    `;
    return <style>{style}</style>;
  }

  return (
    <div className="dark-mode">
      <StyleInjector />
      <div className="container mx-auto p-4">
        <section className="text-center p-8 bg-card-bg rounded-lg mb-8 shadow-lg">
          <h1 className="text-5xl font-bold mb-4" style={{color: 'var(--accent-color)'}}>
            Welcome to GraderSmith
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            Master competitive programming with our modern online judge platform. Practice problems, track progress, and compete with others.
          </p>
        </section>
        <h2 className="text-3xl font-bold mb-4">Practice Problems</h2>
        {loading && <p>Loading problems...</p>}
        {error && <p style={{color: 'var(--error-color)'}}>Error: {error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map(problem => (
            <Link href={`/problem?id=${problem.name}`} key={problem.name}>
              <div className="problem-card p-6 bg-card-bg rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono px-3 py-1 rounded-full" style={{color: 'var(--accent-color)', backgroundColor: 'rgba(59, 130, 246, 0.1)'}}>{problem.name}</span>
                </div>
                <h3 className="text-xl font-semibold text-text-primary">{problem.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
