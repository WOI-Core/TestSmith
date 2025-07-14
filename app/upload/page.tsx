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
  is_tagged: boolean;
  embedding: any;
  isTagging?: boolean;
}

interface GeneratedFile {
  file_path: string;
  content: string;
}

interface ProblemWithStatus {
  id: string;
  name: string;
  difficulty: number;
  tags: string[];
  is_tagged?: boolean;
  embedding?: any;
  isTagging?: boolean;
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
  
  const [untaggedProblems, setUntaggedProblems] = useState<ProblemWithStatus[]>([]);
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

    const canonicalId = taskName.trim();
    setIsUploading(true);
    setStatus(`Processing and uploading task "${canonicalId}"...`);
    try {
        // 1. Prepare markdown and solution for embedding/tagging
        const markdownFile = generatedFiles.find(f => f.file_path.endsWith('.md'));
        const solutionFile = generatedFiles.find(f => f.file_path.endsWith('.cpp'));
        const configFile = generatedFiles.find(f => f.file_path === 'config.json');
        
        if (!markdownFile || !solutionFile) throw new Error('Missing markdown or solution file for embedding.');
        if (!configFile) throw new Error('Missing config.json file.');

        // 2. Upload files to storage FIRST
        setStatus(`Uploading files to storage...`);
        const uploadRes = await fetch('/api/toolsmith/upload-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_name: canonicalId,
                files: generatedFiles,
            }),
        });
        
        if (!uploadRes.ok) {
            const errorData = await uploadRes.json();
            throw new Error(`Storage upload failed: ${errorData.detail || 'Unknown error'}`);
        }

        // 3. Now sync with SearchSmith (files are in storage)
        setStatus(`Syncing with SearchSmith for tagging...`);
        const taggingResponse = await fetch("/api/problems/sync-searchsmith", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                problem_name: canonicalId,
                markdown_content: markdownFile.content,
                solution_code: solutionFile.content,
                problem_id: canonicalId,
            }),
        });

        if (!taggingResponse.ok) {
            const errorData = await taggingResponse.json();
            throw new Error(`SearchSmith tagging failed: ${errorData.message || 'Unknown error'}`);
        }

        const taggingResult = await taggingResponse.json();

        // 4. Upload to Supabase problems table
        setStatus(`Updating database...`);
        const { data, error } = await supabase
            .from('problems')
            .upsert({
                problem_id: canonicalId,
                problem_name: canonicalId,
                markdown_content: markdownFile.content,
                solution_code: solutionFile.content,
                tags: taggingResult.tags || [],
                embedding: taggingResult.embedding || null,
                is_tagged: true,
                difficulty: 800, // Default difficulty
                created_at: new Date().toISOString()
            }, {
                onConflict: 'problem_id'
            });

        if (error) {
            throw new Error(`Failed to upload to Supabase: ${error.message}`);
        }

        toast({ title: "Upload & Tagging Successful", description: "Task uploaded and tagged successfully!" });
        setStatus(`✅ Task "${canonicalId}" uploaded and tagged successfully!`);
        setGeneratedFiles([]);
        setTaskName("");
        // Refresh the problems list
        fetchAllProblemsWithStatus();
    } catch (err: any) {
        toast({ title: "Upload/Tagging Failed", description: err.message, variant: "destructive" });
        setStatus(`❌ Upload/Tagging Error: ${err.message}`);
    } finally {
        setIsUploading(false);
    }
  };

  const fetchAllProblemsWithStatus = useCallback(async () => {
    setIsLoadingUntagged(true);
    try {
      // Fetch all problems from bucket
      const resBucket = await fetch("/api/problems/from-storage");
      const bucketData = await resBucket.json();
      const bucketProblems = Array.isArray(bucketData)
        ? bucketData.map((file: any) => ({
            id: file.id || file.name, // fallback for old format
            name: file.name || file.title || file.id,
            difficulty: file.difficulty || 800,
            tags: file.tags || [],
          }))
        : [];

      // Fetch all problems from table
      const resTable = await fetch("/api/problems");
      const tableData = await resTable.json();
      const tableProblems = Array.isArray(tableData)
        ? tableData.map((row: any) => ({
            id: row.problem_id,
            name: row.problem_name,
            is_tagged: row.is_tagged,
            embedding: row.embedding,
            tags: row.tags || [],
          }))
        : [];

      // Merge: for each bucket problem, attach table info if exists
      const merged = bucketProblems.map((bucketProb) => {
        const tableProb = tableProblems.find((p) => p.id === bucketProb.id || p.name === bucketProb.name);
        return {
          ...bucketProb,
          is_tagged: tableProb?.is_tagged ?? false,
          embedding: tableProb?.embedding,
          tags: tableProb?.tags?.length ? tableProb.tags : bucketProb.tags,
        };
      });
      setUntaggedProblems(merged);
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

  const handleTag = async (problem: ProblemWithStatus) => {
    setUntaggedProblems(problems => problems.map(p => p.id === problem.id ? { ...p, isTagging: true } : p));
    try {
      const canonicalId = problem.name.trim();
      
      // First, ensure the problem exists in storage
      const md = await fetchFile(`${canonicalId}/Problems/${canonicalId}.md`);
      const sol = await fetchFile(`${canonicalId}/Solutions/${canonicalId}.cpp`);
      
      // Call the Express server endpoint for syncing with SearchSmith
      const response = await fetch("/api/problems/sync-searchsmith", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_name: canonicalId,
          markdown_content: md,
          solution_code: sol,
          problem_id: canonicalId, // Always use canonicalId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to tag problem.");
      }

      const result = await response.json();
      
      // Upload to Supabase problems table
      const { data, error } = await supabase
          .from('problems')
          .upsert({
              problem_id: canonicalId,
              problem_name: canonicalId,
              markdown_content: md,
              solution_code: sol,
              tags: result.tags || [],
              embedding: result.embedding || null,
              is_tagged: true,
              difficulty: problem.difficulty || 800,
              created_at: new Date().toISOString()
          }, {
              onConflict: 'problem_id'
          });

      if (error) {
          throw new Error(`Failed to upload to Supabase: ${error.message}`);
      }
      
      // Show detailed success message with SearchSmith results
      const tagsGenerated = result.tags || [];
      const message = `✅ ${canonicalId} tagged successfully!\n\nGenerated tags: ${tagsGenerated.join(', ') || 'None'}\nEmbedding: ${result.embedding ? 'Generated' : 'Failed'}\nDatabase: Updated`;
      
      toast({ 
        title: "SearchSmith Tagging Complete", 
        description: message, 
        duration: 5000
      });
      
      setUntaggedProblems(problems => problems.map(p => p.id === problem.id ? { ...p, isTagging: false, is_tagged: true, embedding: result.embedding, tags: result.tags || p.tags } : p));
      fetchAllProblemsWithStatus();
    } catch (err: any) {
      toast({ title: "Error tagging", description: err.message, variant: "destructive" });
      setUntaggedProblems(problems => problems.map(p => p.id === problem.id ? { ...p, isTagging: false } : p));
    }
  };



  useEffect(() => {
    fetchAllProblemsWithStatus();
  }, [fetchAllProblemsWithStatus]);
  
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
          <CardDescription>Problems that exist in the database but haven't been tagged with embeddings yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end space-x-2 mb-4">
            <Button onClick={fetchAllProblemsWithStatus} disabled={isLoadingUntagged}>
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
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUntagged ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
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
                        {problem.tags && problem.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {problem.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No tags</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {problem.is_tagged ? (
                          <span className="text-green-600 text-sm">Tagged</span>
                        ) : (
                          <span className="text-orange-600 text-sm">Untagged</span>
                        )}
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
                    <TableCell colSpan={6} className="text-center h-24">No untagged problems found in database.</TableCell>
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
