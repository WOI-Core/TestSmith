"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

export default function SubmissionsPage() {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetch(`/api/submissions/user/${user.userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setSubmissions(data.data.submissions);
                    }
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user]);

    if (loading) {
        return <p className="p-8 text-center">Loading your submissions...</p>;
    }

    if (!user) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Please Login</h2>
                <p className="text-text-secondary">You need to be logged in to view your submissions.</p>
                <Link href="/login" className="mt-4 inline-block bg-accent-color text-white px-6 py-2 rounded-md font-semibold">
                    Go to Login
                </Link>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6">Your Submissions</h2>
            <div className="bg-card-bg rounded-lg shadow-md overflow-x-auto">
                <table className="w-full min-w-[600px]">
                    <thead className="bg-header-bg">
                        <tr>
                            <th className="p-4 text-left font-semibold">Problem</th>
                            <th className="p-4 text-left font-semibold">Language</th>
                            <th className="p-4 text-left font-semibold">Status</th>
                            <th className="p-4 text-left font-semibold">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.length > 0 ? submissions.map(sub => (
                            <tr key={sub.id} className="border-b border-border-color last:border-b-0 hover:bg-input-bg transition-colors">
                                <td className="p-4"><Link href={`/problem?id=${sub.problemId}`} className="text-accent-color hover:underline">{sub.problemId}</Link></td>
                                <td className="p-4">{sub.language}</td>
                                <td className={`p-4 font-bold ${sub.status === 'Accepted' ? 'text-success-color' : 'text-error-color'}`}>{sub.status}</td>
                                <td className="p-4 text-text-secondary">{new Date(sub.timestamp).toLocaleString()}</td>
                            </tr>
                        )) : (
                           <tr>
                                <td colSpan={4} className="p-8 text-center text-text-secondary">You have no submissions yet.</td>
                           </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
