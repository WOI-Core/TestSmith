"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { api } from '@/lib/api-client';

interface LeaderboardEntry {
  rank: number;
  username: string;
  problems_solved: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const response = await api.progress.getLeaderboard();
        
        if (response.success) {
          // Handle both direct array and data wrapped response
          const leaderboardData = response.data || response;
          
          if (Array.isArray(leaderboardData)) {
            setLeaderboard(leaderboardData);
          } else {
            console.error("Unexpected API response structure:", response);
            throw new Error('Invalid leaderboard data format');
          }
        } else {
          throw new Error(response.error || 'Failed to fetch leaderboard data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading leaderboard...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Problems Solved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry) => (
                <TableRow key={entry.rank}>
                  <TableCell className="font-medium">{entry.rank}</TableCell>
                  <TableCell>
                      <Link href={`/profile/${entry.username}`} className="text-blue-600 hover:underline">
                          {entry.username}
                      </Link>
                  </TableCell>
                  <TableCell className="text-right">{entry.problems_solved}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}