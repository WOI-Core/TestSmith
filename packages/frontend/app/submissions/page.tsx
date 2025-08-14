"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

interface TestResult {
  test_case: number;
  input: string;
  expected_output: string;
  actual_output: string;
  status: string;
  execution_time: number;
  memory_used: number;
  error?: string;
  judge0_status: string;
}

interface Submission {
  id: number;
  problem_id: string;
  language: string;
  status: string;
  created_at: string;
  test_results: TestResult[];
  total_test_cases: number;
  passed_test_cases: number;
  execution_time: number;
  memory_used: number;
  error_message?: string;
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
          const response = await api.submissions.getByUser(user.id);
          
          if (response.success) {
            setSubmissions(response.data || []);
          } else {
            throw new Error(response.error || 'Failed to fetch submissions');
          }
        } catch (err: any) {
          setError(err.message || 'Failed to fetch submissions');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Wrong Answer':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Time Limit Exceeded':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'Compilation Error':
      case 'Runtime Error':
      case 'Memory Limit Exceeded':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'bg-green-100 text-green-800';
      case 'Wrong Answer':
        return 'bg-red-100 text-red-800';
      case 'Time Limit Exceeded':
        return 'bg-orange-100 text-orange-800';
      case 'Compilation Error':
      case 'Runtime Error':
      case 'Memory Limit Exceeded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
                <TableHead>Test Cases</TableHead>
                <TableHead>Performance</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(submission.status)}
                        <Badge className={getStatusColor(submission.status)}>
                          {submission.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {submission.total_test_cases > 0 ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-green-600">{submission.passed_test_cases}</span>
                            <span>/</span>
                            <span>{submission.total_test_cases}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((submission.passed_test_cases / submission.total_test_cases) * 100)}% passed
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.execution_time > 0 ? (
                        <div className="text-sm">
                          <div>{submission.execution_time.toFixed(3)}s</div>
                          <div className="text-xs text-gray-500">
                            {(submission.memory_used / 1024).toFixed(1)}MB
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(submission.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No submissions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}