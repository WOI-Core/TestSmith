// app/upload/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, RefreshCw, Send } from "lucide-react";

interface UntaggedProblem {
  id: string;
  name: string;
  difficulty: number;
  tags: string[];
}

interface FullProblemDetails {
  id: string;
  name: string;
  statement: string;
  solution: string;
  difficulty: number;
  timeLimit?: number;
  memoryLimit?: number;
  note?: string;
  tags: string[];
}

export default function UploadPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [contentName, setContentName] = useState("");
  const [casesSize, setCasesSize] = useState(5);
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(false);

  const [untaggedProblems, setUntaggedProblems] = useState<UntaggedProblem[]>([]);
  const [isLoadingUntagged, setIsLoadingUntagged] = useState(false);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setStatus("Generating problem, please wait...");

    try {
      const res = await fetch("/api/toolsmith", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_name: contentName, cases_size: casesSize, detail }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate problem");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contentName}_problem.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus("✅ Problem generated and downloaded successfully!");
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

const fetchUntaggedProblems = async () => {
  setIsLoadingUntagged(true);
  try {
    const res = await fetch("/api/problems/from-storage");
    const data = await res.json();
    const problems = Array.isArray(data)
      ? data.map((file: { name: string }) => ({
          id: file.name,
          name: file.name,
          difficulty: 800,
          tags: [] as string[],
        }))
      : [];
    setUntaggedProblems(problems);
  } catch (error: any) {
    toast({ title: "Error", description: error.message, variant: "destructive" });
    setUntaggedProblems([]);
  } finally {
    setIsLoadingUntagged(false);
  }
};

  useEffect(() => {
    fetchUntaggedProblems();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>🛠️ ToolSmith</CardTitle>
            <CardDescription>AI-Powered Competitive Programming Task Generator</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="flex flex-col gap-4 p-4 bg-card-bg rounded-lg">
              <div>
                <label htmlFor="contentName" className="block font-semibold mb-1">
                  Content Name <span className="text-xs font-normal text-text-secondary">(e.g. prime_checker)</span>
                </label>
                <Input
                  id="contentName"
                  type="text"
                  value={contentName}
                  onChange={(e) => setContentName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="casesSize" className="block font-semibold mb-1">
                  Number of Test Cases
                </label>
                <Input
                  id="casesSize"
                  type="number"
                  min={1}
                  max={20}
                  value={casesSize}
                  onChange={(e) => setCasesSize(parseInt(e.target.value))}
                  required
                />
              </div>

              <div>
                <label htmlFor="detail" className="block font-semibold mb-1">
                  Problem Description
                </label>
                <Textarea
                  id="detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" disabled={generating}>
                {generating ? "Generating..." : "Generate and Download ZIP"}
              </Button>

              {status && (
                <p className="mt-2 text-center p-2 bg-input-bg rounded">
                  {status}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Problems in Storage (Untagged)</CardTitle>
            <CardDescription>Problems that are fetched but not tagged yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end space-x-2 mb-4">
              <Button onClick={fetchUntaggedProblems} disabled={isLoadingUntagged}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {isLoadingUntagged ? "Syncing..." : "Sync Problems"}
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUntagged ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : (untaggedProblems.length ?? 0) > 0 ? (
                  untaggedProblems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell>{problem.id}</TableCell>
                      <TableCell>{problem.name}</TableCell>
                      <TableCell>{problem.difficulty}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Send className="mr-2 h-4 w-4" />
                          Tag
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No problems found in storage.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}