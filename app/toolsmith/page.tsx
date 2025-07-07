"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ToolsmithPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [contentName, setContentName] = useState('');
    const [casesSize, setCasesSize] = useState(5);
    const [detail, setDetail] = useState('');
    const [status, setStatus] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        // Redirect if not admin after auth state is loaded
        if (!authLoading && user?.role !== 'admin') {
            router.push('/');
        }
    }, [user, authLoading, router]);
    
    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        setStatus('Generating problem, please wait...');
        
        try {
            const res = await fetch('/api/toolsmith', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content_name: contentName, cases_size: casesSize, detail }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Failed to generate problem. The server returned an invalid response.' }));
                throw new Error(errorData.error || 'Failed to generate problem');
            }
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${contentName}_problem.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            setStatus('✅ Problem generated and downloaded successfully!');

        } catch (err: any) {
            setStatus(`❌ Error: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    if (authLoading) {
        return <p className="p-8 text-center">Loading...</p>;
    }

    if (user?.role !== 'admin') {
        return <p className="p-8 text-center text-error-color">Access Denied. This page is for administrators only.</p>;
    }

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <h2 className="text-3xl font-bold mb-2 text-center">🛠️ ToolSmith</h2>
            <p className="text-center text-text-secondary mb-6">AI-Powered Competitive Programming Task Generator</p>
            <form onSubmit={handleGenerate} className="flex flex-col gap-4 p-8 bg-card-bg rounded-lg shadow-md">
                <div>
                    <label htmlFor="contentName" className="block mb-1 font-semibold">Problem Name <span className="text-text-secondary text-sm font-normal">(e.g., `prime_checker`)</span></label>
                    <input id="contentName" type="text" value={contentName} onChange={e => setContentName(e.target.value)} className="w-full p-2 bg-input-bg rounded border border-border-color" required />
                </div>
                 <div>
                    <label htmlFor="casesSize" className="block mb-1 font-semibold">Number of Test Cases</label>
                    <input id="casesSize" type="number" value={casesSize} onChange={e => setCasesSize(parseInt(e.target.value))} className="w-full p-2 bg-input-bg rounded border border-border-color" min="1" max="20" required />
                </div>
                <div>
                    <label htmlFor="detail" className="block mb-1 font-semibold">Problem Description</label>
                    <textarea id="detail" value={detail} onChange={e => setDetail(e.target.value)} rows="10" className="w-full p-2 bg-input-bg rounded border border-border-color font-mono" placeholder="Describe requirements, constraints, input/output format, and any special conditions..." required></textarea>
                </div>
                <button type="submit" disabled={generating} className="p-3 bg-success-color text-white rounded-md font-bold disabled:bg-gray-500 hover:bg-success-hover transition-colors">
                    {generating ? 'Generating...' : 'Generate and Download ZIP'}
                </button>
                {status && <p className="mt-4 text-center p-3 rounded-md bg-input-bg">{status}</p>}
            </form>
        </div>
    );
};
