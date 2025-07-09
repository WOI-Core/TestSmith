"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ProblemsPage() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showTagsForUnsolved, setShowTagsForUnsolved] = useState(true)
  const [hideSolvedProblems, setHideSolvedProblems] = useState(false)
  const [difficultyFrom, setDifficultyFrom] = useState("")
  const [difficultyTo, setDifficultyTo] = useState("")

  // Mock problems data with Codeforces-style structure
  const mockProblems = [
    {
      id: "2124I",
      name: "Lexicographic Partition",
      tags: ["constructive algorithms", "math", "trees"],
      difficulty: 1600,
      solvers: 40,
      solved: false,
    },
    {
      id: "2124H",
      name: "Longest Good Subsequence",
      tags: ["dp", "math"],
      difficulty: 1800,
      solvers: 45,
      solved: false,
    },
    {
      id: "2124G",
      name: "Maximise Sum",
      tags: ["binary search", "data structures"],
      difficulty: 1400,
      solvers: 84,
      solved: true,
    },
    {
      id: "2124F2",
      name: "Appending Permutations (Hard Version)",
      tags: ["combinatorics", "dp"],
      difficulty: 2100,
      solvers: 220,
      solved: false,
    },
    {
      id: "2124F1",
      name: "Appending Permutations (Easy Version)",
      tags: ["combinatorics", "dp"],
      difficulty: 1700,
      solvers: 805,
      solved: false,
    },
    {
      id: "2124E",
      name: "Make it Zero",
      tags: ["constructive algorithms", "greedy", "math"],
      difficulty: 1500,
      solvers: 2103,
      solved: false,
    },
    {
      id: "2124D",
      name: "Make a Palindrome",
      tags: ["greedy", "sortings", "two pointers"],
      difficulty: 1300,
      solvers: 4707,
      solved: true,
    },
    {
      id: "2124C",
      name: "Subset Multiplication",
      tags: ["constructive algorithms", "greedy", "math", "number theory"],
      difficulty: 1200,
      solvers: 9128,
      solved: false,
    },
  ]

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProblems(mockProblems)
      setLoading(false)
    }, 1000)
  }, [])

  const getDifficultyColor = (difficulty) => {
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
    return matchesSearch && matchesSolved
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Problems Table */}
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
                            <Link href={`/problem?id=${problem.id}`} className="text-blue-600 hover:underline">
                              {problem.id}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Link
                                href={`/problem?id=${problem.id}`}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                {problem.name}
                              </Link>
                              <div className="flex flex-wrap gap-1">
                                {(showTagsForUnsolved || problem.solved) &&
                                  problem.tags.map((tag, index) => (
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
                              <span className="text-sm text-blue-600">x{problem.solvers}</span>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pay Attention Card */}
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

            {/* Filter Problems */}
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
                  <Button variant="link" className="text-xs p-0 h-auto mt-1 text-blue-600">
                    Add tag
                  </Button>
                </div>
                <Button size="sm" className="w-full">
                  Apply
                </Button>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="show-tags" checked={showTagsForUnsolved} onCheckedChange={setShowTagsForUnsolved} />
                  <label htmlFor="show-tags" className="text-sm">
                    Show tags for unsolved problems
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="hide-solved" checked={hideSolvedProblems} onCheckedChange={setHideSolvedProblems} />
                  <label htmlFor="hide-solved" className="text-sm">
                    Hide solved problems
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Last Unsolved */}
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
