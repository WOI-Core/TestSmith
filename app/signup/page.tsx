"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role: 'user' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        login(data.data);
        router.push('/');
      } else {
        throw new Error(data.error || 'Signup failed');
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
        <h2 className="text-3xl font-bold text-center mb-6 text-text-primary">Create Your Account</h2>
        {error && <p className="bg-error-color/20 text-error-color text-center p-3 rounded-md mb-4">{error}</p>}
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="p-3 bg-input-bg rounded-md border border-border-color focus:ring-2 focus:ring-accent-color outline-none"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="p-3 bg-input-bg rounded-md border border-border-color focus:ring-2 focus:ring-accent-color outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="p-3 bg-input-bg rounded-md border border-border-color focus:ring-2 focus:ring-accent-color outline-none"
            required
          />
          <button type="submit" disabled={loading} className="p-3 bg-success-color text-white rounded-md font-bold hover:bg-success-hover disabled:bg-gray-500 transition-colors">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center mt-6 text-text-secondary">
          Already have an account? <Link href="/login" className="text-accent-color hover:underline">Login</Link>
        </p>
         <p className="text-center mt-2 text-text-secondary">
          Creating an admin account? <Link href="/admin-signup" className="text-accent-color hover:underline">Admin Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
