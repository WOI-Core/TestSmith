"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

interface Submission {
  id: number;
  problem_id: string;
  language: string;
  status: string;
  created_at: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Only run this effect if the user object is available
    if (user && user.id) {
      const fetchSubmissions = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`http://localhost:3001/api/submissions/user/${user.id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch submissions');
          }
          const data = await response.json();
          setSubmissions(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchSubmissions();
    } else {
        // If there's no user, stop loading and show a message.
        setLoading(false);
    }
  }, [user]); // The effect depends on the user object

  if (loading) {
    return <div className="text-center py-10">Loading submissions...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-10">{error}</div>;
  }
  
  if (!user) {
    return <div className="text-center py-10">Please log in to view your submissions.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">My Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Problem</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length > 0 ? (
                submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <Link href={`/problem?id=${submission.problem_id}`} className="text-blue-600 hover:underline">
                        {submission.problem_id}
                      </Link>
                    </TableCell>
                    <TableCell>{submission.language}</TableCell>
                    <TableCell>{submission.status}</TableCell>
                    <TableCell>{new Date(submission.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No submissions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}