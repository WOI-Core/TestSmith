"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, ChevronRight, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Problem {
  id: string;
  name: string;
  tags: string[];
  difficulty: number;
  solvers: number;
  solved: boolean;
  relevance?: number;
  reason?: string;
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

  const [aiSearchQuery, setAiSearchQuery] = useState("")
  const [aiSearchResults, setAiSearchResults] = useState<Problem[]>([])
  const [aiSearching, setAiSearching] = useState(false)
  const [showAiResults, setShowAiResults] = useState(false)

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
  }, [])

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) return
    setAiSearching(true)
    setShowAiResults(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/problems/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: aiSearchQuery }),
      });
      if (!response.ok) {
          throw new Error('AI search failed');
      }
      const results = await response.json();
      setAiSearchResults(results);
    } catch (err: any) {
      console.error("AI Search failed:", err)
      setError(err.message)
    } finally {
      setAiSearching(false)
    }
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1200) return "text-gray-600"
    if (difficulty <= 1400) return "text-green-600"
    if (difficulty <= 1600) return "text-cyan-600"
    if (difficulty <= 1900) return "text-blue-600"
    if (difficulty <= 2100) return "text-purple-600"
    if (difficulty <= 2400) return "text-yellow-600"
    return "text-red-600"
  }

  const filteredProblems = (showAiResults ? aiSearchResults : problems).filter((problem) => {
    const matchesSearch =
      problem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSolved = !hideSolvedProblems || !problem.solved;
    const difficulty = problem.difficulty;
    const from = difficultyFrom ? parseInt(difficultyFrom, 10) : -Infinity;
    const to = difficultyTo ? parseInt(difficultyTo, 10) : Infinity;
    const matchesDifficulty = difficulty >= from && difficulty <= to;
    return matchesSearch && matchesSolved && matchesDifficulty;
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="shadow-sm mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                  SearchSmith
                  <Badge variant="outline" className="ml-2 text-xs bg-purple-100 text-purple-600 border-purple-200">
                    AI Problem Finder
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Describe what you want to practice..."
                      value={aiSearchQuery}
                      onChange={(e) => setAiSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAiSearch()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAiSearch}
                      disabled={aiSearching || !aiSearchQuery.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {aiSearching ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {showAiResults && (
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-purple-700">
                        {aiSearching ? "AI is finding relevant problems..." : `Found ${aiSearchResults.length} problems`}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowAiResults(false)}>
                        Show All
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">
                  {showAiResults ? "AI Recommended Problems" : "Problems"} ({filteredProblems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        {showAiResults && <TableHead>Match</TableHead>}
                        <TableHead className="text-center">Difficulty</TableHead>
                        <TableHead className="text-center">Solvers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProblems.map((problem) => (
                        <TableRow key={problem.id}>
                          <TableCell className="font-medium">
                            <Link href={`/problem?id=${problem.id}`} className="text-blue-600 hover:underline">{problem.id}</Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/problem?id=${problem.id}`} className="text-blue-600 hover:underline font-medium">{problem.name}</Link>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {problem.tags.map((tag, index) => (
                                    <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{tag}</span>
                                ))}
                            </div>
                            {showAiResults && problem.reason && (
                                <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1">💡 {problem.reason}</div>
                            )}
                          </TableCell>
                          {showAiResults && (
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{problem.relevance}%</Badge>
                            </TableCell>
                          )}
                          <TableCell className={`text-center font-medium ${getDifficultyColor(problem.difficulty)}`}>{problem.difficulty}</TableCell>
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
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Pay attention
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm">
                  <div className="font-medium text-blue-900 mb-1">Before contest</div>
                  <Link href="#" className="text-blue-600 hover:underline">
                    Codeforces Round (Div. 1 + Div. 2)
                  </Link>
                  <div className="text-xs text-blue-700 mt-1">10 days</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Filter</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search:</label>
                  <Input placeholder="Name or ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8"/>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty:</label>
                  <div className="flex items-center space-x-2">
                    <Input placeholder="From" value={difficultyFrom} onChange={(e) => setDifficultyFrom(e.target.value)} className="h-8"/>
                    <span>—</span>
                    <Input placeholder="To" value={difficultyTo} onChange={(e) => setDifficultyTo(e.target.value)} className="h-8"/>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="show-tags" checked={showTagsForUnsolved} onCheckedChange={(checked) => setShowTagsForUnsolved(Boolean(checked))} />
                  <label htmlFor="show-tags" className="text-sm">Show tags for unsolved</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="hide-solved" checked={hideSolvedProblems} onCheckedChange={(checked) => setHideSolvedProblems(Boolean(checked))} />
                  <label htmlFor="hide-solved" className="text-sm">Hide solved</label>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Last unsolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-gray-600">
                    <span>#</span>
                    <span>Name</span>
                    <span>Last submission</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">372A</span>
                    <Link href="#" className="text-blue-600 hover:underline flex-1 mx-2 truncate">
                      Counting Kangaroos is Fun
                    </Link>
                    <span className="text-xs text-gray-500">309986550</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}