"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminSignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminKey, setAdminKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleAdminSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            // Send admin key to server for validation
            const response = await api.auth.adminSignup({
                username,
                email,
                password,
                adminKey, // Server will validate this securely
            });

            if (response.success && response.data) {
                login(response.data.user, response.data.token);
                router.push('/admin');
            } else {
                throw new Error(response.error || 'Admin signup failed');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create admin account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-80px)] p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Admin Account Creation</CardTitle>
                    <CardDescription>
                        For authorized personnel only
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    
                    <form onSubmit={handleAdminSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="admin_username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                minLength={3}
                                maxLength={30}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Strong password (min 8 characters)"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="adminKey">Admin Access Key</Label>
                            <Input
                                id="adminKey"
                                type="password"
                                placeholder="Enter admin access key"
                                value={adminKey}
                                onChange={e => setAdminKey(e.target.value)}
                                required
                            />
                        </div>
                        
                        <Button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full"
                        >
                            {loading ? 'Creating Account...' : 'Create Admin Account'}
                        </Button>
                    </form>
                    
                    <div className="text-center mt-4">
                        <Link href="/signup" className="text-sm text-blue-600 hover:underline">
                            Need a regular account? Sign up here
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
