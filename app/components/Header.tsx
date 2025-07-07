"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  // Basic styling for the header links
  const linkStyle = "text-text-secondary hover:text-text-primary font-medium transition-colors";
  const activeLinkStyle = "text-accent-color font-bold"; // You can enhance this

  return (
    <header className="flex justify-between items-center bg-card-bg border-b border-border-color p-4 h-20 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-2xl font-bold text-accent-color">
          GraderSmith
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/submissions" className={linkStyle}>Submissions</Link>
          <Link href="/leaderboard" className={linkStyle}>Leaderboard</Link>
          {user?.role === 'admin' && (
            <Link href="/toolsmith" className={linkStyle}>ToolSmith</Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-text-secondary">
              Welcome, <strong className="text-text-primary">{user.username}</strong>
              {user.role === 'admin' && ' (Admin)'}
            </span>
            <button
              onClick={logout}
              className="bg-error-color text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="bg-accent-color text-white px-4 py-2 rounded-md font-semibold hover:bg-accent-hover transition-colors">
                Login
            </Link>
            <Link href="/signup" className="bg-success-color text-white px-4 py-2 rounded-md font-semibold hover:bg-success-hover transition-colors">
                Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
