"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "../context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Clock,
  MemoryStickIcon as Memory,
  Code,
  Play,
  MessageCircle,
  Share2,
  Bookmark,
  Trophy,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  Heart,
} from "lucide-react"

function ProblemComponent() {
  const searchParams = useSearchParams()
  const problemId = searchParams.get("id")
  const { user } = useAuth()

  const [problem, setProblem] = useState<any>(null)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("71")
  const [results, setResults] = useState<any[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("description")
  const [comments, setComments] = useState([
    {
      id: 1,
      user: "CodeMaster",
      avatar: "CM",
      content: "Great problem! The key insight is to use dynamic programming with memoization.",
      likes: 12,
      timestamp: "2 hours ago",
      isLiked: false,
    },
    {
      id: 2,
      user: "AlgoExpert",
      avatar: "AE",
      content: "I solved this using a greedy approach. Time complexity is O(n log n).",
      likes: 8,
      timestamp: "4 hours ago",
      isLiked: true,
    },
  ])
  const [newComment, setNewComment] = useState("")
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      user: "Alice",
      status: "Accepted",
      time: "1.2s",
      memory: "64MB",
      language: "Python",
      timestamp: "5 min ago",
    },
    {
      id: 2,
      user: "Bob",
      status: "Wrong Answer",
      time: "0.8s",
      memory: "32MB",
      language: "C++",
      timestamp: "12 min ago",
    },
    {
      id: 3,
      user: "Charlie",
      status: "Time Limit Exceeded",
      time: "2.0s",
      memory: "128MB",
      language: "Java",
      timestamp: "18 min ago",
    },
  ])

  useEffect(() => {
    if (problemId) {
      const fetchProblem = async () => {
        try {
          const res = await fetch(`/api/problems/${problemId}/config`)
          if (!res.ok) throw new Error("Problem not found")
          const data = await res.json()
          setProblem(data.data)
        } catch (error: any) {
          setError(error.message)
        }
      }
      fetchProblem()
    }
  }, [problemId])

  const handleSubmit = async () => {
    if (!user) {
      alert("Please login to submit your solution.")
      return
    }
    setSubmitting(true)
    setError("")
    setResults(null)
    try {
      const res = await fetch("/api/submissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          language_id: language,
          source_code: code,
          userId: user.userId,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResults(data.data.results)
        setActiveTab("results")
      } else {
        throw new Error(data.error || "Submission failed")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommentSubmit = () => {
    if (!newComment.trim()) return
    const comment = {
      id: comments.length + 1,
      user: user?.username || "Anonymous",
      avatar: user?.username?.charAt(0).toUpperCase() || "A",
      content: newComment,
      likes: 0,
      timestamp: "Just now",
      isLiked: false,
    }
    setComments([comment, ...comments])
    setNewComment("")
  }

  const toggleLike = (commentId: number) => {
    setComments(
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
              isLiked: !comment.isLiked,
            }
          : comment,
      ),
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Wrong Answer":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "Time Limit Exceeded":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  if (!problemId) return <div className="p-8 text-center">No problem selected.</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>
  if (!problem) return <div className="p-8 text-center">Loading problem...</div>

  const formatProblemName = (name: string) => {
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6">
        {/* Problem Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                Problem #{problemId}
              </Badge>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                Medium
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={isBookmarked ? "bg-purple-50 text-purple-700 border-purple-200" : ""}
              >
                <Bookmark className={`h-4 w-4 mr-1 ${isBookmarked ? "fill-current" : ""}`} />
                {isBookmarked ? "Saved" : "Save"}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{formatProblemName(problemId)}</h1>

          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Time Limit: {problem.timeLimit || "2000"} ms
            </div>
            <div className="flex items-center">
              <Memory className="h-4 w-4 mr-1" />
              Memory Limit: {problem.memoryLimit || "256"} MB
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              1,234 submissions
            </div>
            <div className="flex items-center">
              <Trophy className="h-4 w-4 mr-1" />
              567 solved
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Problem Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white border border-purple-100">
                <TabsTrigger
                  value="description"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="submissions"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
                >
                  Submissions
                </TabsTrigger>
                <TabsTrigger
                  value="discuss"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Discuss
                </TabsTrigger>
                <TabsTrigger
                  value="results"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
                >
                  Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl text-gray-900">Problem Statement</CardTitle>
                  </CardHeader>
                  <CardContent className="prose max-w-none">
                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                      <h3 className="text-lg font-semibold mb-3">Description</h3>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        Given an array of integers, find the maximum sum of a contiguous subarray. This is a classic
                        problem that can be solved using Kadane's algorithm.
                      </p>
                      <p className="text-gray-700 leading-relaxed">
                        Your task is to implement an efficient solution that runs in O(n) time complexity.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">Input</h4>
                        <p className="text-sm text-green-700">
                          First line contains integer n (1 ≤ n ≤ 10^5)
                          <br />
                          Second line contains n integers (-10^9 ≤ ai ≤ 10^9)
                        </p>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">Output</h4>
                        <p className="text-sm text-blue-700">Print the maximum sum of contiguous subarray</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-800 mb-3">Example</h4>
                      <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                        <div className="mb-2">
                          <span className="text-gray-600">Input:</span>
                          <br />
                          5<br />
                          -2 1 -3 4 5
                        </div>
                        <div>
                          <span className="text-gray-600">Output:</span>
                          <br />9
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="submissions" className="mt-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-purple-600" />
                      Recent Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {submissions.map((submission) => (
                        <div
                          key={submission.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(submission.status)}
                            <div>
                              <div className="font-medium text-gray-900">{submission.user}</div>
                              <div className="text-sm text-gray-500">{submission.timestamp}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{submission.status}</div>
                            <div className="text-xs text-gray-500">
                              {submission.time} • {submission.memory} • {submission.language}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discuss" className="mt-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageCircle className="h-5 w-5 mr-2 text-purple-600" />
                      Discussion ({comments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Comment Input */}
                    {user && (
                      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Textarea
                              placeholder="Share your thoughts, hints, or ask questions..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                              rows={3}
                            />
                            <div className="flex justify-end mt-2">
                              <Button
                                onClick={handleCommentSubmit}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                                disabled={!newComment.trim()}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Post Comment
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gray-100 text-gray-700 text-sm">
                                {comment.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-medium text-gray-900">{comment.user}</span>
                                <span className="text-sm text-gray-500">{comment.timestamp}</span>
                              </div>
                              <p className="text-gray-700 mb-3">{comment.content}</p>
                              <div className="flex items-center space-x-4">
                                <button
                                  onClick={() => toggleLike(comment.id)}
                                  className={`flex items-center space-x-1 text-sm ${
                                    comment.isLiked ? "text-red-600" : "text-gray-500 hover:text-red-600"
                                  } transition-colors`}
                                >
                                  <Heart className={`h-4 w-4 ${comment.isLiked ? "fill-current" : ""}`} />
                                  <span>{comment.likes}</span>
                                </button>
                                <button className="text-sm text-gray-500 hover:text-purple-600 transition-colors">
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results" className="mt-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="h-5 w-5 mr-2 text-purple-600" />
                      Submission Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {results ? (
                      <div className="space-y-3">
                        {results.map((result, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${
                              result.status.description === "Accepted"
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(result.status.description)}
                                <span className="font-semibold">Test Case #{index + 1}</span>
                              </div>
                              <span
                                className={`font-bold ${
                                  result.status.description === "Accepted" ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {result.status.description}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-2">
                              Time: {result.time}s • Memory: {result.memory}KB
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Eye className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Submit your solution to see results</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Code Editor */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 mr-2 text-purple-600" />
                    Solution
                  </CardTitle>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="71">Python</SelectItem>
                      <SelectItem value="54">C++</SelectItem>
                      <SelectItem value="62">Java</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-gray-900 rounded-b-lg">
                  <Textarea
                    className="w-full bg-transparent text-green-400 font-mono text-sm border-0 focus:ring-0 resize-none"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="# Write your solution here..."
                    rows={20}
                    style={{ minHeight: "400px" }}
                  />
                </div>
                <div className="p-4 border-t border-gray-200">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !code.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Submit Solution
                      </>
                    )}
                  </Button>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProblemPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProblemComponent />
    </Suspense>
  )
}
