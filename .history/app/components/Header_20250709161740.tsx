"use client"
import Link from "next/link"
import { useAuth } from "../context/AuthContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Settings, Trophy, Code } from "lucide-react"

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="w-full border-b border-purple-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
              <Code className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              GraderSmith
            </span>
          </Link>

          {/* Centered Navigation */}
          <nav className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
            <Link href="/problems" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
              Problems
            </Link>
            <Link href="/submissions" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
              Submissions
            </Link>
            <Link href="/leaderboard" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
              Leaderboard
            </Link>
            {user?.role === "admin" && (
              <Link href="/toolsmith" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">
                ToolSmith
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-purple-200">
                      <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.username}</p>
                      {user.role === "admin" && <p className="text-xs text-purple-600 font-medium">Administrator</p>}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/submissions" className="cursor-pointer">
                      <Trophy className="mr-2 h-4 w-4" />
                      My Submissions
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-3">
                <Button asChild variant="ghost" className="text-gray-700 hover:text-purple-600">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
