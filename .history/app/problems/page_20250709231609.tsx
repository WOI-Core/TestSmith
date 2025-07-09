"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Problem {
  id: number;
  name: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
}

export default function ProblemsPage() {
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch("/api/problems");
        if (!response.ok) {
          throw new Error("Failed to fetch problems");
        }
        const data = await response.json();
        setAllProblems(data);
        setFilteredProblems(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    if (!searchQuery.trim()) {
      setFilteredProblems(allProblems);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/search/v1/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      const data = await response.json();
      const recommendedNames: string[] = data.recommended_problems || [];
      
      const newFiltered = allProblems.filter(problem => 
        recommendedNames.includes(problem.name)
      );
      setFilteredProblems(newFiltered);

    } catch (error) {
      console.error("Failed to perform search:", error);
      // Optionally, show a toast notification to the user
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-500 hover:bg-green-600";
      case "Medium":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "Hard":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search for Problems</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <Input
              type="search"
              placeholder="Search for problems by topic, tag, or keyword..."
              className="flex-grow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          filteredProblems.map((problem) => (
            <Link href={`/problem?id=${problem.id}`} key={problem.id} passHref>
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{problem.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {problem.tags && problem.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <Badge className={`text-white ${getDifficultyClass(problem.difficulty)}`}>
                    {problem.difficulty}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
         {!loading && filteredProblems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500">No problems found.</p>
            <p className="text-sm text-gray-400">Try adjusting your search query or browse all problems.</p>
          </div>
        )}
      </div>
    </div>
  );
}
