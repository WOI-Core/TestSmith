"use client"

import { useState, useEffect, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Upload, RefreshCw, Send } from "lucide-react"

interface UntaggedProblem {
  id: string
  name: string
  statement: string
  solution: string
  // Add other fields from your Supabase table if needed
}

export default function UploadPage() {
  const { toast } = useToast()
  const [problemName, setProblemName] = useState("")
  const [markdownContent, setMarkdownContent] = useState("")
  const [solutionCode, setSolutionCode] = useState("")
  const [difficulty, setDifficulty] = useState(800)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [untaggedProblems, setUntaggedProblems] = useState<UntaggedProblem[]>([])
  const [isLoadingUntagged, setIsLoadingUntagged] = useState(false)
  const [syncingProblemId, setSyncingProblemId] = useState<string | null>(null)

  const fetchUntaggedProblems = async () => {
    setIsLoadingUntagged(true)
    try {
      const response = await fetch("/api/problems/untagged")
      if (!response.ok) throw new Error("Failed to fetch untagged problems.")
      const data = await response.json()
      setUntaggedProblems(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoadingUntagged(false)
    }
  }

  useEffect(() => {
    fetchUntaggedProblems()
  }, [])

  const handleAddProblem = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Client-side validation for required fields
    if (!problemName.trim() || !markdownContent.trim() || !solutionCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Problem Name, Problem Statement, and Solution Code cannot be empty.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: problemName,
          statement: markdownContent,
          solution: solutionCode,
          difficulty: difficulty,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to add problem.")
      }

      toast({
        title: "Success",
        description: "Problem has been added to the database.",
      })
      // Clear form and refresh untagged list
      setProblemName("")
      setMarkdownContent("")
      setSolutionCode("")
      setDifficulty(800)
      fetchUntaggedProblems()
    } catch (error: any) {
      toast({
        title: "Error adding problem",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSyncProblem = async (problem: UntaggedProblem) => {
    setSyncingProblemId(problem.id)
    try {
      const response = await fetch("/api/problems/sync-searchsmith", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_name: problem.name,
          markdown_content: problem.statement,
          solution_code: problem.solution,
          problem_id: problem.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to sync with SearchSmith.")
      }
      
      const result = await response.json()
      toast({
        title: "Sync Successful",
        description: `Problem "${result.problem_name}" has been indexed by SearchSmith.`,
      })
      // Remove from list on successful sync
      setUntaggedProblems((prev) => prev.filter((p) => p.id !== problem.id))
    } catch (error: any) {
      toast({
        title: "Error syncing problem",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSyncingProblemId(null)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Upload className="mr-3 h-8 w-8" />
        Problem Management
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Add New Problem</CardTitle>
            <CardDescription>
              Add a new problem to the Supabase database. It will then appear in the sync list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProblem} className="space-y-4">
              <div>
                <label htmlFor="problemName" className="block text-sm font-medium mb-1">Problem Name</label>
                <Input
                  id="problemName"
                  value={problemName}
                  onChange={(e) => setProblemName(e.target.value)}
                  placeholder="e.g., Two Sum"
                  required
                />
              </div>
              <div>
                <label htmlFor="markdownContent" className="block text-sm font-medium mb-1">Problem Statement (Markdown)</label>
                <Textarea
                  id="markdownContent"
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="Write the problem description here..."
                  rows={8}
                  required
                />
              </div>
              <div>
                <label htmlFor="solutionCode" className="block text-sm font-medium mb-1">Solution (Code)</label>
                <Textarea
                  id="solutionCode"
                  value={solutionCode}
                  onChange={(e) => setSolutionCode(e.target.value)}
                  placeholder="Write the solution code here..."
                  rows={8}
                  required
                  className="font-mono"
                />
              </div>
              <div>
                 <label htmlFor="difficulty" className="block text-sm font-medium mb-1">Difficulty</label>
                 <Input
                    id="difficulty"
                    type="number"
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    placeholder="e.g., 1200"
                    required
                 />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Submitting..." : "Add Problem"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Sync with SearchSmith</CardTitle>
                <CardDescription>
                  Problems below are in the database but not yet indexed for searching.
                </CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={fetchUntaggedProblems} disabled={isLoadingUntagged}>
                <RefreshCw className={`h-4 w-4 ${isLoadingUntagged ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Problem Name</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUntagged ? (
                  <TableRow key="loading-row"><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>
                ) : untaggedProblems.length > 0 ? (
                  untaggedProblems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell className="font-medium">{problem.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSyncProblem(problem)}
                          disabled={syncingProblemId === problem.id}
                        >
                          {syncingProblemId === problem.id ? (
                            "Syncing..."
                          ) : (
                            <><Send className="mr-2 h-4 w-4" /> Sync</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow key="no-problems-row"><TableCell colSpan={2} className="text-center">All problems are synced!</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
