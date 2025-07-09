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
  id: string
  name: string
  tags: string[]
  difficulty: number
  solvers: number
  solved: boolean
  relevance?: number
  reason?: string
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
      setLoading(true)
      try {
        const mockProblems: Problem[] = [
          { id: "1A", name: "Theatre Square", tags: ["math"], difficulty: 1000, solvers: 50000, solved: false },
          { id: "4A", name: "Watermelon", tags: ["brute force"], difficulty: 800, solvers: 45000, solved: true },
          { id: "71A", name: "Way Too Long Words", tags: ["strings"], difficulty: 800, solvers: 40000, solved: false },
          { id: "158A", name: "Next Round", tags: ["implementation"], difficulty: 800, solvers: 35000, solved: false },
          { id: "231A", name: "Team", tags: ["brute force"], difficulty: 800, solvers: 30000, solved: true },
          { id: "282A", name: "Bit++", tags: ["implementation"], difficulty: 800, solvers: 28000, solved: false },
          { id: "339A", name: "Helpful Maths", tags: ["greedy", "implementation"], difficulty: 800, solvers: 25000, solved: false },
          { id: "112A", name: "Petya and Strings", tags: ["implementation", "strings"], difficulty: 800, solvers: 22000, solved: true },
        ]
        setProblems(mockProblems)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProblems()
  }, [])

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) return
    setAiSearching(true)
    setShowAiResults(true)
    setError(null)
    try {
      const mockResults = problems.slice(0, 3).map((p) => ({
        ...p,
        relevance: Math.floor(Math.random() * 30) + 70,
        reason: "Good for practicing " + p.tags[0],
      }))
      setAiSearchResults(mockResults)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAiSearching(false)
    }
  }

  const getDifficultyColor = (d: number) => {
    if (d <= 1200) return "text-gray-600"
    if (d <= 1400) return "text-green-600"
    if (d <= 1600) return "text-cyan-600"
    if (d <= 1900) return "text-blue-600"
    if (d <= 2100) return "text-purple-600"
    if (d <= 2400) return "text-yellow-600"
    return "text-red-600"
  }

  const filteredProblems = (showAiResults ? aiSearchResults : problems).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSolved = !hideSolvedProblems || !p.solved
    const from = difficultyFrom ? parseInt(difficultyFrom, 10) : Number.NEGATIVE_INFINITY
    const to = difficultyTo ? parseInt(difficultyTo, 10) : Number.POSITIVE_INFINITY
    const matchesDiff = p.difficulty >= from && p.difficulty <= to
    return matchesSearch && matchesSolved && matchesDiff
  })

  if (loading && !problems.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-lg mx-auto px-6 py-6">
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
            <div className="flex space-x-2">
              <Input
                placeholder="Describe what you want to practice..."
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAiSearch()}
                className="flex-1"
              />
              <Button onClick={handleAiSearch} disabled={aiSearching || !aiSearchQuery.trim()} className="bg-purple-600 hover:bg-purple-700">
                {aiSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
          </CardContent>
        </Card>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-[3]">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">
                  {showAiResults ? "AI Recommended Problems" : "Problems"} ({filteredProblems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Search name or ID"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                    />
                    <Input
                      placeholder="Diff from"
                      value={difficultyFrom}
                      onChange={(e) => setDifficultyFrom(e.target.value)}
                      className="h-8 w-20"
                    />
                    <Input
                      placeholder="to"
                      value={difficultyTo}
                      onChange={(e) => setDifficultyTo(e.target.value)}
                      className="h-8 w-20"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <Checkbox
                      id="show-tags-header"
                      checked={showTagsForUnsolved}
                      onCheckedChange={(c) => setShowTagsForUnsolved(!!c)}
                    />
                    <label htmlFor="show-tags-header" className="text-sm">
                      Show tags
                    </label>
                    <Checkbox
                      id="hide-solved-header"
                      checked={hideSolvedProblems}
                      onCheckedChange={(c) => setHideSolvedProblems(!!c)}
                    />
                    <label htmlFor="hide-solved-header" className="text-sm">
                      Hide solved
                    </label>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-20">#</TableHead>
                        <TableHead>Name</TableHead>
                        {showAiResults && <TableHead className="w-24 text-center">Match</TableHead>}
                        <TableHead className="w-24 text-center">Difficulty</TableHead>
                        <TableHead className="w-24 text-center">Solvers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProblems.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <Link href={`/problem?id=${p.id}`} className="text-blue-600 hover:underline">
                              {p.id}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Link href={`/problem?id=${p.id}`} className="text-blue-600 hover:underline font-medium">
                                {p.name}
                              </Link>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.tags.map((tag, i) => (
                                  <span key={i} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              {showAiResults && p.reason && (
                                <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1">
                                  💡 {p.reason}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          {showAiResults && (
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {p.relevance}%
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className={`text-center font-medium ${getDifficultyColor(p.difficulty)}`}>
                            {p.difficulty}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Users className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-blue-600">x{p.solvers}</span>
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
          <aside className="flex-[1] space-y-4">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Last unsolved</CardTitle>
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
          </aside>
        </div>
      </div>
    </div>
  )
}