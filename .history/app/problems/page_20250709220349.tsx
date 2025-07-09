"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Problem {
  id: string;
  name: string;
  tags: string[];
  difficulty: number;
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProblems = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:3001/api/problems');
        if (!response.ok) {
          throw new Error('Failed to fetch problems');
        }
        const data = await response.json();
        setProblems(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, []);

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1200) return "text-gray-600";
    if (difficulty <= 1400) return "text-green-600";
    if (difficulty <= 1600) return "text-cyan-600";
    if (difficulty <= 1900) return "text-blue-600";
    if (difficulty <= 2100) return "text-purple-600";
    if (difficulty <= 2400) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-10">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Problems</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problems.map((problem) => (
                  <TableRow key={problem.id}>
                    <TableCell>
                      <Link href={`/problem?id=${problem.id}`} className="text-blue-600 hover:underline">
                        {problem.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/problem?id=${problem.id}`} className="text-blue-600 hover:underline font-medium">
                        {problem.name}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {problem.tags.map((tag, index) => (
                          <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className={`text-center font-medium ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}