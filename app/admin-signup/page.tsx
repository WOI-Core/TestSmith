"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminSignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminKey, setAdminKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    // In a real app, this key would be validated on the server against an environment variable.
    const CLIENT_SIDE_ADMIN_KEY = 'gradersmith-admin-2024';

    const handleAdminSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (adminKey !== CLIENT_SIDE_ADMIN_KEY) {
            setError("Invalid Admin Access Key");
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role: 'admin' }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                login(data.data.user, data.data.token);
                router.push('/');
            } else {
                throw new Error(data.error || 'Admin signup failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-80px)] p-4">
            <div className="w-full max-w-md p-8 bg-card-bg rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center mb-2 text-text-primary">Admin Account Creation</h2>
                <p className="text-center text-warning-color bg-warning-color/10 p-3 rounded-md mb-6">⚠️ For authorized personnel only.</p>
                {error && <p className="bg-error-color/20 text-error-color text-center p-3 rounded-md mb-4">{error}</p>}
                <form onSubmit={handleAdminSignup} className="flex flex-col gap-4">
                    <input type="text" placeholder="Admin Username" value={username} onChange={e => setUsername(e.target.value)} className="p-3 bg-input-bg rounded-md border border-border-color" required />
                    <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} className="p-3 bg-input-bg rounded-md border border-border-color" required />
                    <input type="password" placeholder="Admin Password" value={password} onChange={e => setPassword(e.target.value)} className="p-3 bg-input-bg rounded-md border border-border-color" required />
                    <input type="password" placeholder="Admin Access Key" value={adminKey} onChange={e => setAdminKey(e.target.value)} className="p-3 bg-input-bg rounded-md border border-border-color" required />
                    <button type="submit" disabled={loading} className="p-3 bg-purple-600 text-white rounded-md font-bold hover:bg-purple-700 disabled:bg-gray-500">
                        {loading ? 'Creating Account...' : 'Create Admin Account'}
                    </button>
                </form>
                 <p className="text-center mt-6 text-text-secondary">
                    Need a regular account? <Link href="/signup" className="text-accent-color hover:underline">User Sign Up</Link>
                </p>
            </div>
        </div>
    );
};
