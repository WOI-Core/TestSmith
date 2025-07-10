// app/upload/page.tsx
"use client";

import React, { useState, useEffect, FormEvent, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Send, Loader2, Download, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import JSZip from "jszip";

interface UntaggedProblem {
  id: string;
  name: string;
  difficulty: number;
  tags: string[];
  isTagging?: boolean;
}

interface GeneratedFile {
  file_path: string;
  content: string;
}

export default function UploadPage() {
  const { toast } = useToast();

  const [contentName, setContentName] = useState("");
  const [casesSize, setCasesSize] = useState(5);
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [taskName, setTaskName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  const [untaggedProblems, setUntaggedProblems] = useState<UntaggedProblem[]>([]);
  const [isLoadingUntagged, setIsLoadingUntagged] = useState(false);

  const handleGenerateAndPreview = async (e: FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedFiles([]);
    setStatus("Generating problem, please wait...");

    try {
      const res = await fetch("/api/toolsmith/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_name: contentName, cases_size: casesSize, detail }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate problem preview");
      }
      
      const blob = await res.blob();
      const zip = await JSZip.loadAsync(blob);
      const files: GeneratedFile[] = [];
      let rootFolderName = '';

      const rootFolders = new Set<string>();
      zip.forEach((relativePath) => {
        if (relativePath.includes('/') && !relativePath.endsWith('/')) {
            rootFolders.add(relativePath.split('/')[0]);
        }
      });
      
      if (rootFolders.size === 1) {
          rootFolderName = Array.from(rootFolders)[0];
      } else {
          rootFolderName = contentName.replace(/[^a-z0-9._-]/gi, '_').toLowerCase() || "problem";
      }
      setTaskName(rootFolderName);

      const filePromises = Object.keys(zip.files).map(async (filename) => {
        const file = zip.files[filename];
        if (!file.dir) {
          const content = await file.async("string");
          const cleanedPath = filename.startsWith(`${rootFolderName}/`) 
            ? filename.substring(rootFolderName.length + 1) 
            : filename;
          
          if(cleanedPath) {
            files.push({ file_path: cleanedPath, content: content });
          }
        }
      });
      
      await Promise.all(filePromises);

      setGeneratedFiles(files);
      if (files.length > 0) {
        files.sort((a, b) => a.file_path.localeCompare(b.file_path));
        setSelectedFileName(files[0].file_path);
      }
      setStatus(`✅ Preview extracted from ZIP for "${rootFolderName}".`);

    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = () => {
    if (generatedFiles.length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder(taskName);
    if (folder) {
        generatedFiles.forEach(file => {
            folder.file(file.file_path, file.content);
        });
    }
    zip.generateAsync({ type: "blob" }).then(content => {
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${taskName}_problem.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });
  };
  
  const handleUploadToGrader = async () => {
    if (generatedFiles.length === 0 || !taskName) {
        toast({ title: "Error", description: "No generated files to upload. Please generate a preview first.", variant: "destructive" });
        return;
    }

    setIsUploading(true);
    setStatus(`Uploading task "${taskName}" to storage...`);
    try {
        const response = await fetch('/api/toolsmith/upload-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_name: taskName,
                files: generatedFiles
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to upload task.');
        }

        const result = await response.json();
        toast({ title: "Upload Successful", description: result.message, variant: "success" });
        setStatus(`✅ ${result.message}`);
        setGeneratedFiles([]);
        setTaskName("");

    } catch (err: any) {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
        setStatus(`❌ Upload Error: ${err.message}`);
    } finally {
        setIsUploading(false);
    }
  };

  const fetchUntaggedProblems = useCallback(async () => {
    setIsLoadingUntagged(true);
    try {
      const res = await fetch("/api/problems/from-storage");
      const data = await res.json();
      const problems = Array.isArray(data)
        ? data.map((file: { name: string }) => ({ id: file.name, name: file.name, difficulty: 800, tags: [] as string[] }))
        : [];
      setUntaggedProblems(problems);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setUntaggedProblems([]);
    } finally {
      setIsLoadingUntagged(false);
    }
  }, [toast]);

  const fetchFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("problems").download(path);
    if (error || !data) throw new Error(error?.message || "Download error");
    return await data.text();
  };

  const handleTag = async (problem: UntaggedProblem) => {
    setUntaggedProblems(problems => problems.map(p => p.id === problem.id ? { ...p, isTagging: true } : p));
    try {
      const md = await fetchFile(`${problem.name}/Problems/${problem.name}.md`);
      const sol = await fetchFile(`${problem.name}/Solutions/${problem.name}.cpp`);
      
      // FIX: Call a new API route on your Next.js backend instead of localhost directly.
      const response = await fetch("/api/problems/tag-and-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_name: problem.name,
          markdown_content: md,
          solution_code: sol,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to tag problem.");
      }

      toast({ title: "Tagged", description: `${problem.name} saved and synced.`, variant: "success" });
      setUntaggedProblems(problems => problems.filter(p => p.id !== problem.id));
    } catch (err: any) {
      toast({ title: "Error tagging", description: err.message, variant: "destructive" });
      setUntaggedProblems(problems => problems.map(p => p.id === problem.id ? { ...p, isTagging: false } : p));
    }
  };

  useEffect(() => {
    fetchUntaggedProblems();
  }, [fetchUntaggedProblems]);
  
  const selectedFileContent = generatedFiles.find(f => f.file_path === selectedFileName)?.content || "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🛠️ ToolSmith</CardTitle>
          <CardDescription>AI-Powered Competitive Programming Task Generator</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerateAndPreview} className="flex flex-col gap-4 p-4">
            <Input placeholder="Content Name (e.g. prime_checker)" value={contentName} onChange={(e) => setContentName(e.target.value)} required />
            <Input type="number" min={1} max={20} placeholder="Number of Test Cases" value={casesSize} onChange={(e) => setCasesSize(parseInt(e.target.value))} required />
            <Textarea placeholder="Problem Description" value={detail} onChange={(e) => setDetail(e.target.value)} rows={5} required />
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate & Preview"}
            </Button>
            {status && <p className="mt-2 text-center p-2 bg-muted rounded">{status}</p>}
          </form>
        </CardContent>
      </Card>

      {generatedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Files</CardTitle>
            <CardDescription>Preview the generated files before downloading or uploading.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select onValueChange={setSelectedFileName} value={selectedFileName}>
              <SelectTrigger>
                <SelectValue placeholder="Select a file to preview" />
              </SelectTrigger>
              <SelectContent>
                {generatedFiles.map((file) => (
                  <SelectItem key={file.file_path} value={file.file_path}>
                    {file.file_path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              readOnly
              value={selectedFileContent}
              className="h-72 font-mono bg-muted"
              placeholder="File content will be displayed here."
            />
            <div className="flex gap-4">
              <Button onClick={handleDownloadZip} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download ZIP
              </Button>
              <Button onClick={handleUploadToGrader} disabled={isUploading} className="w-full">
                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><UploadCloud className="mr-2 h-4 w-4" /> Upload to Grader</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Problems in Storage (Untagged)</CardTitle>
          <CardDescription>Problems that are fetched but not tagged yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end space-x-2 mb-4">
            <Button onClick={fetchUntaggedProblems} disabled={isLoadingUntagged}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingUntagged ? 'animate-spin' : ''}`} />
              {isLoadingUntagged ? "Syncing..." : "Sync Problems"}
            </Button>
          </div>
          <div className="border rounded-md">
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
                    <TableCell colSpan={4} className="text-center h-24">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : untaggedProblems.length > 0 ? (
                  untaggedProblems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell>{problem.id}</TableCell>
                      <TableCell>{problem.name}</TableCell>
                      <TableCell>
                        <Input type="number" defaultValue={problem.difficulty} className="w-24" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleTag(problem)} disabled={problem.isTagging}>
                          {problem.isTagging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Tag
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">No problems found in storage.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
