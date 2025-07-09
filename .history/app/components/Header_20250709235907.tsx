"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Upload } from "lucide-react"

const navItems = [
  { href: "/problems", label: "Problems" },
  { href: "/submissions", label: "Submissions" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/toolsmith", label: "ToolSmith" },
  { href: "/upload", label: "Upload" }, // Added Upload Tab
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">GraderSmith</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors hover:text-foreground/80 ${
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <nav className="grid gap-6 text-lg font-medium">
                  <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
                    <span>GraderSmith</span>
                  </Link>
                  {navItems.map((item) => (
                     <Link key={item.href} href={item.href} className="hover:text-foreground">{item.label}</Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <Button variant="ghost" size="icon">
            <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
              T
            </div>
          </Button>
        </div>
      </div>
    </header>
  )
}
