"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Problem {
  id: string;
  name: string;
  tags: string[];
  difficulty: number;
  solvers: number;
  solved: boolean;
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showTagsForUnsolved, setShowTagsForUnsolved] = useState(true)
  const [hideSolvedProblems, setHideSolvedProblems] = useState(false)
  const [difficultyFrom, setDifficultyFrom] = useState("")
  const [difficultyTo, setDifficultyTo] = useState("")

  useEffect(() => {
    const fetchProblems = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/problems');
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
  }, [])

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1200) return "text-gray-600"
    if (difficulty <= 1400) return "text-green-600"
    if (difficulty <= 1600) return "text-cyan-600"
    if (difficulty <= 1900) return "text-blue-600"
    if (difficulty <= 2100) return "text-purple-600"
    if (difficulty <= 2400) return "text-yellow-600"
    return "text-red-600"
  }

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      problem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSolved = !hideSolvedProblems || !problem.solved
    const difficulty = problem.difficulty;
    const from = difficultyFrom ? parseInt(difficultyFrom, 10) : -Infinity;
    const to = difficultyTo ? parseInt(difficultyTo, 10) : Infinity;
    const matchesDifficulty = difficulty >= from && difficulty <= to;

    return matchesSearch && matchesSolved && matchesDifficulty;
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading problems...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <p className="text-red-500">{error}</p>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold flex items-center">
                    Problems
                    <div className="ml-2 text-sm text-gray-500">({filteredProblems.length})</div>
                  </CardTitle>
                  <ChevronRight className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-20 font-semibold">#</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="w-16 text-center">
                          <div className="flex items-center justify-center">
                            <span className="text-orange-500">⚡</span>
                          </div>
                        </TableHead>
                        <TableHead className="w-16 text-center">
                          <div className="flex items-center justify-center">
                            <span className="text-green-500">✓</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProblems.map((problem) => (
                        <TableRow key={problem.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <Link href={`/problem/${problem.id}`} className="text-blue-600 hover:underline">
                              {problem.id}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Link
                                href={`/problem/${problem.id}`}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                {problem.name}
                              </Link>
                              <div className="flex flex-wrap gap-1">
                                {(showTagsForUnsolved || problem.solved) &&
                                  problem.tags?.map((tag: string, index: number) => (
                                    <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {tag}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${getDifficultyColor(problem.difficulty)}`}>
                              {problem.difficulty}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Users className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-blue-600">x{problem.solvers || 0}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Filter Problems
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty:</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="From"
                      value={difficultyFrom}
                      onChange={(e) => setDifficultyFrom(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <span className="text-sm">—</span>
                    <Input
                      placeholder="To"
                      value={difficultyTo}
                      onChange={(e) => setDifficultyTo(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="show-tags" checked={showTagsForUnsolved} onCheckedChange={(checked) => setShowTagsForUnsolved(Boolean(checked))} />
                  <label htmlFor="show-tags" className="text-sm">
                    Show tags for unsolved problems
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="hide-solved" checked={hideSolvedProblems} onCheckedChange={(checked) => setHideSolvedProblems(Boolean(checked))} />
                  <label htmlFor="hide-solved" className="text-sm">
                    Hide solved problems
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}