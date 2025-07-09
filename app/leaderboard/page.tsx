"use client"

import { useState, useEffect } from "react"
import { Trophy, Medal, Award, Crown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/progress/leaderboard")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`)
        }
        return res.json()
      })
      .then((apiResponse) => {
        if (apiResponse.success && apiResponse.data && Array.isArray(apiResponse.data.leaderboard)) {
          setLeaderboard(apiResponse.data.leaderboard)
        } else {
          console.error("Unexpected API response structure:", apiResponse)
          setLeaderboard([])
        }
      })
      .catch((error) => {
        console.error("Failed to load leaderboard:", error)
        setLeaderboard([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-6 w-6 text-yellow-500" />
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-gray-600">#{index + 1}</span>
    }
  }

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
      case 1:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
      case 2:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white"
      default:
        return "bg-purple-100 text-purple-700"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-800 rounded-full mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Leaderboard</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how you rank among the top programmers in our community
          </p>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Second Place */}
            <div className="order-1 md:order-1">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4">
                    <Avatar className="h-16 w-16 border-4 border-gray-300">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-xl font-bold">
                        {leaderboard[1]?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white mb-2">2nd Place</Badge>
                  <CardTitle className="text-lg">{leaderboard[1]?.username}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold text-gray-700 mb-1">{leaderboard[1]?.points}</div>
                  <div className="text-sm text-gray-600">{leaderboard[1]?.solved} problems solved</div>
                </CardContent>
              </Card>
            </div>

            {/* First Place */}
            <div className="order-2 md:order-2">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 transform md:scale-110">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 relative">
                    <Avatar className="h-20 w-20 border-4 border-yellow-400">
                      <AvatarFallback className="bg-yellow-200 text-yellow-800 text-2xl font-bold">
                        {leaderboard[0]?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Crown className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500" />
                  </div>
                  <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white mb-2">🏆 Champion</Badge>
                  <CardTitle className="text-xl">{leaderboard[0]?.username}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-yellow-700 mb-1">{leaderboard[0]?.points}</div>
                  <div className="text-sm text-yellow-600">{leaderboard[0]?.solved} problems solved</div>
                </CardContent>
              </Card>
            </div>

            {/* Third Place */}
            <div className="order-3 md:order-3">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4">
                    <Avatar className="h-16 w-16 border-4 border-amber-400">
                      <AvatarFallback className="bg-amber-200 text-amber-800 text-xl font-bold">
                        {leaderboard[2]?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white mb-2">3rd Place</Badge>
                  <CardTitle className="text-lg">{leaderboard[2]?.username}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold text-amber-700 mb-1">{leaderboard[2]?.points}</div>
                  <div className="text-sm text-amber-600">{leaderboard[2]?.solved} problems solved</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-gray-900">Complete Rankings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {leaderboard.map((user, index) => (
                  <div
                    key={user.username}
                    className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12">{getRankIcon(index)}</div>
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.solved} problems solved</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">{user.points}</div>
                      <div className="text-sm text-gray-500">points</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No rankings yet</h3>
                <p className="text-gray-600">Be the first to solve problems and claim the top spot!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
