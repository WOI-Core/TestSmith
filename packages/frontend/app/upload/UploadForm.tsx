// app/upload/UploadForm.tsx
"use client";

import React, { useState, useEffect, FormEvent, useCallback, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useUrlState } from "@/hooks/useUrlState";
import { RefreshCw, Send, Loader2, Download, UploadCloud, Trash2, AlertCircle, Search, Filter } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { slugify } from "@/lib/slugify";
import { slugifyTaskName } from "common";
import { 
  filterProblems, 
  getFilterStats, 
  getFilterDescription,
  type TagFilter,
  type Problem as FilterProblem
} from "@/lib/problemFilters";
import JSZip from "jszip";

// Type definitions
type Problem = FilterProblem;

interface GeneratedFile {
  file_path: string;
  content: string;
}

interface ApiError {
  detail?: string;
  message?: string;
  error?: string;
}

interface TaskRequest {
  content_name: string;
  cases_size: number;
  detail: string;
}

interface SearchSmithResult {
  tags: string[];
  embedding: number[] | null;
}

interface UploadResponse {
  message: string;
  task_name: string;
  file_count: number;
  files?: string[];
}

// Constants
const SEARCH_DEBOUNCE_MS = 300;

// Utility functions
const handleApiError = async (response: Response): Promise<never> => {
  let errorData: ApiError = { detail: "Unknown error occurred" };
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    } else {
      const text = await response.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        errorData = { detail: `Server returned HTML error page (${response.status} ${response.statusText})` };
      } else {
        errorData = { detail: text || `HTTP ${response.status}: ${response.statusText}` };
      }
    }
  } catch (parseError) {
    console.error("Failed to parse error response:", parseError);
    errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
  }
  
  const message = errorData.detail || errorData.message || errorData.error || "Unknown error occurred";
  throw new Error(message);
};

export default function UploadForm() {
  const { toast } = useToast();

  // Form state
  const [contentName, setContentName] = useState("");
  const [casesSize, setCasesSize] = useState(5);
  const [detail, setDetail] = useState("");
  
  // Generation state
  const [status, setStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [taskName, setTaskName] = useState("");
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  
  // Problems state
  const [untaggedProblems, setUntaggedProblems] = useState<Problem[]>([]);
  const [isLoadingUntagged, setIsLoadingUntagged] = useState(false);

  // Filter state with URL persistence
  const [searchTermRaw, setSearchTermRaw] = useState("");
  const [tagFilter, setTagFilter] = useUrlState<TagFilter>('filter', 'all');
  
  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTermRaw, SEARCH_DEBOUNCE_MS);

  // Sync URL with search term (with debounce)
  const [urlSearchTerm, setUrlSearchTerm] = useUrlState<string>('search', '');
  
  useEffect(() => {
    if (debouncedSearchTerm !== urlSearchTerm) {
      setUrlSearchTerm(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, urlSearchTerm, setUrlSearchTerm]);

  useEffect(() => {
    if (urlSearchTerm !== searchTermRaw) {
      setSearchTermRaw(urlSearchTerm);
    }
  }, [urlSearchTerm, searchTermRaw]);

  // Filtered problems with memoization
  const filteredProblems = useMemo(() => {
    return filterProblems(untaggedProblems, debouncedSearchTerm, tagFilter);
  }, [untaggedProblems, debouncedSearchTerm, tagFilter]);

  // Filter statistics
  const filterStats = useMemo(() => {
    return getFilterStats(untaggedProblems);
  }, [untaggedProblems]);

  // Filter description
  const filterDescription = useMemo(() => {
    return getFilterDescription(
      untaggedProblems.length,
      filteredProblems.length,
      debouncedSearchTerm,
      tagFilter
    );
  }, [untaggedProblems.length, filteredProblems.length, debouncedSearchTerm, tagFilter]);

  // Validation
  const canGenerate = useMemo(() => {
    return contentName.trim().length > 0 && 
           detail.trim().length > 0 && 
           casesSize >= 1 && 
           casesSize <= 20 && 
           !isGenerating;
  }, [contentName, detail, casesSize, isGenerating]);

  const canDownload = useMemo(() => {
    return zipBlob !== null && taskName.length > 0;
  }, [zipBlob, taskName]);

  const canUpload = useMemo(() => {
    return zipBlob !== null && taskName.length > 0 && !isUploading;
  }, [zipBlob, taskName, isUploading]);

  const handleGenerateAndPreview = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!canGenerate) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields with valid values.",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedFiles([]);
    setStatus("Generating problem, please wait...");
    setZipBlob(null);
    setTaskName("");
    setSelectedFileName("");

    try {
      const requestBody: TaskRequest = {
        content_name: contentName.trim(),
        cases_size: casesSize,
        detail: detail.trim()
      };

      const res = await fetch("/api/toolsmith/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        await handleApiError(res);
      }
      
      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("Received empty response from server");
      }
      
      setZipBlob(blob);
      
      const zip = await JSZip.loadAsync(blob);
      const files: GeneratedFile[] = [];
      let rootFolderName = '';

      const rootFolders = new Set<string>();
      zip.forEach((relativePath) => {
        if (relativePath.includes("/") && !relativePath.endsWith("/")) {
          rootFolders.add(relativePath.split("/")[0]);
        }
      });
      
      if (rootFolders.size === 1) {
        rootFolderName = Array.from(rootFolders)[0];
        // Clean up the folder name to ensure consistent naming
        rootFolderName = slugifyTaskName(rootFolderName);
      } else {
        rootFolderName = slugifyTaskName(contentName);
      }
      setTaskName(rootFolderName);

      const filePromises = Object.keys(zip.files).map(async (filename) => {
        const file = zip.files[filename];
        if (!file.dir) {
          try {
            const content = await file.async("string");
            const cleanedPath = filename.startsWith(`${rootFolderName}/`) 
              ? filename.substring(rootFolderName.length + 1) 
              : filename;
            
            if (cleanedPath.trim()) {
              files.push({ file_path: cleanedPath, content: content });
            }
          } catch (error) {
            console.warn(`Failed to extract file ${filename}:`, error);
          }
        }
      });
      
      await Promise.all(filePromises);

      if (files.length === 0) {
        throw new Error("No valid files found in generated ZIP");
      }

      files.sort((a, b) => a.file_path.localeCompare(b.file_path));
      setGeneratedFiles(files);
      setSelectedFileName(files[0].file_path);
      setStatus(`✅ Preview generated with ${files.length} files for "${rootFolderName}".`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setStatus(`❌ Error: ${errorMessage}`);
      toast.error("Generation Failed", {
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = () => {
    if (!canDownload) {
      toast.error("Download Error", {
        description: "No ZIP file available for download.",
      });
      return;
    }
    
    try {
      const url = window.URL.createObjectURL(zipBlob!);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${taskName}.zip`; // Remove "_problem" suffix for cleaner names
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Download Started", {
        description: `Downloading ${taskName}.zip`,
      });
    } catch (error) {
      toast.error("Download Failed", {
        description: "Failed to start download",
      });
    }
  };
  
  const handleUploadToGrader = async () => {
    if (!canUpload) {
      toast.error("Upload Error", {
        description: "No ZIP file available for upload. Please generate a preview first.",
      });
      return;
    }

    const canonicalId = slugifyTaskName(taskName);
    setIsUploading(true);
    setStatus(`Uploading ZIP for "${canonicalId}"...`);
    
    try {
      const formData = new FormData();
      formData.append("file", zipBlob!, `${canonicalId}.zip`); // Remove "_problem" suffix
      formData.append("task_name", canonicalId);

      const uploadRes = await fetch('/api/toolsmith/upload-task-zip', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) {
        await handleApiError(uploadRes);
      }

      const result: UploadResponse = await uploadRes.json();
      
      toast.success("Upload Successful", {
        description: `Task "${canonicalId}" uploaded with ${result.file_count || 0} files!`,
      });
      setStatus(`✅ Task "${canonicalId}" uploaded successfully!`);
      
      setGeneratedFiles([]);
      setTaskName("");
      setZipBlob(null);
      setSelectedFileName("");
      
      await fetchAllProblemsWithStatus();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown upload error";
      toast.error("Upload Failed", {
        description: errorMessage,
      });
      setStatus(`❌ Upload Error: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAllProblemsWithStatus = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingUntagged(true);
    try {
      const resBucket = await fetch("/api/problems/from-storage", { signal });
      if (signal?.aborted) return;
      if (!resBucket.ok) {
        await handleApiError(resBucket);
      }
      const bucketData: { name: string }[] = await resBucket.json();

      const resTable = await fetch("/api/problems", { signal });
      if (signal?.aborted) return;
      if (!resTable.ok) {
        await handleApiError(resTable);
      }
      const tableData: {
        problem_id: string;
        is_tagged: boolean;
        embedding: number[] | null;
        tags: string[];
        difficulty: number;
      }[] = await resTable.json();
      
      const tableProblemsMap = new Map(
        Array.isArray(tableData) ? tableData.map((row) => [row.problem_id, row]) : []
      );

      const mergedProblems: Problem[] = Array.isArray(bucketData)
        ? bucketData.map((bucketProb) => {
            const originalName = bucketProb.name;
            const canonicalId = slugify(originalName, { 
              caseStyle: 'snake', 
              maxLength: 50,
              preserveNumbers: true 
            });
            const tableProb = tableProblemsMap.get(canonicalId);
            
            return {
              id: canonicalId,
              name: originalName,
              difficulty: tableProb?.difficulty ?? 800,
              tags: tableProb?.tags ?? [],
              is_tagged: tableProb?.is_tagged ?? false,
              embedding: tableProb?.embedding ?? null,
            };
          })
        : [];
      
      if (signal?.aborted) return;
      setUntaggedProblems(mergedProblems);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Fetch aborted for sync.");
        return;
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to sync problems";
      toast.error("Sync Error", {
        description: errorMessage,
      });
      if (!signal?.aborted) {
        setUntaggedProblems([]);
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingUntagged(false);
      }
    }
  }, [toast]);

  const fetchFile = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("problems")
      .download(path);
    if (error || !data) {
      throw new Error(error?.message || "Failed to download file");
    }
    return await data.text();
  };

  const handleTag = async (problem: Problem) => {
    if (!window.confirm(`Are you sure you want to tag "${problem.name}"? This will generate new tags and an embedding.`)) {
      return;
    }

    setUntaggedProblems((problems) =>
      problems.map((p) =>
        p.id === problem.id ? { ...p, isTagging: true } : p,
      ),
    );
    
    try {
      const canonicalId = problem.id;
      
      const [md, sol] = await Promise.all([
        fetchFile(`${canonicalId}/Problems/${canonicalId}.md`),
        fetchFile(`${canonicalId}/Solutions/${canonicalId}.cpp`),
      ]);
      
      const response = await fetch("/api/problems/sync-searchsmith", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_name: canonicalId,
          markdown_content: md,
          solution_code: sol,
          problem_id: canonicalId,
        }),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const result: SearchSmithResult = await response.json();
      
      const { error: supabaseError } = await supabase.from("problems").upsert(
        {
          problem_id: canonicalId,
          problem_name: canonicalId,
          markdown_content: md,
          solution_code: sol,
          tags: result.tags || [],
          embedding: result.embedding || null,
          is_tagged: true,
          difficulty: problem.difficulty || 800,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "problem_id",
        },
      );

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }
      
      const tagsGenerated = result.tags || [];
      const message = `${canonicalId} tagged successfully!\n\nTags: ${tagsGenerated.join(', ') || 'None'}\nEmbedding: ${result.embedding ? 'Generated' : 'Failed'}`;
      
      toast.success("Tagging Complete", {
        description: message,
      });
      
      setUntaggedProblems((problems) =>
        problems.map((p) =>
          p.id === problem.id 
            ? { 
                ...p, 
                isTagging: false, 
                is_tagged: true, 
                embedding: result.embedding, 
                tags: result.tags || p.tags 
              } 
            : p,
        ),
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Tagging failed";
      toast.error("Tagging Failed", {
        description: errorMessage,
      });
      
      setUntaggedProblems((problems) =>
        problems.map((p) =>
          p.id === problem.id ? { ...p, isTagging: false } : p,
        ),
      );
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!window.confirm("Are you sure you want to delete this problem? This action cannot be undone.")) {
      return;
    }
    
    setUntaggedProblems((problems) =>
      problems.map((p) =>
        p.id === problemId ? { ...p, isDeleting: true } : p,
      ),
    );
    
    try {
      const res = await fetch(`/api/problems/${problemId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        await handleApiError(res);
      }
      
      toast.success("Problem Deleted", {
        description: `Problem ${problemId} was deleted successfully.`,
      });
      
      setUntaggedProblems((problems) =>
        problems.filter((p) => p.id !== problemId),
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Delete failed";
      toast.error("Delete Failed", {
        description: errorMessage,
      });
      
      setUntaggedProblems((problems) =>
        problems.map((p) =>
          p.id === problemId ? { ...p, isDeleting: false } : p,
        ),
      );
    }
  };

  const handleDifficultyChange = useCallback((problemId: string, value: string) => {
    const newDifficulty = parseInt(value, 10);
    setUntaggedProblems(problems =>
        problems.map(p =>
            p.id === problemId ? { ...p, difficulty: isNaN(newDifficulty) ? p.difficulty : newDifficulty } : p
        )
    );
  }, []);

  const clearFilters = () => {
    setSearchTermRaw("");
    setTagFilter('all');
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchAllProblemsWithStatus(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchAllProblemsWithStatus]);
  
  const selectedFileContent = useMemo(() => {
    return generatedFiles.find(f => f.file_path === selectedFileName)?.content || "";
  }, [generatedFiles, selectedFileName]);

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>🛠️ ToolSmith</CardTitle>
          <CardDescription>AI-Powered Competitive Programming Task Generator</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerateAndPreview} className="flex flex-col gap-4 p-4">
            <Input 
              placeholder="Content Name (e.g. prime_checker)" 
              value={contentName} 
              onChange={(e) => setContentName(e.target.value)} 
              required 
              maxLength={100}
              disabled={isGenerating}
            />
            <Input 
              type="number" 
              min={1} 
              max={20} 
              placeholder="Number of Test Cases" 
              value={casesSize} 
              onChange={(e) => setCasesSize(parseInt(e.target.value) || 1)} 
              required 
              disabled={isGenerating}
            />
            <Textarea 
              placeholder="Problem Description" 
              value={detail} 
              onChange={(e) => setDetail(e.target.value)} 
              rows={5} 
              required 
              maxLength={5000}
              disabled={isGenerating}
            />
            <Button type="submit" disabled={!canGenerate}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Generating...
                </>
              ) : (
                "Generate & Preview"
              )}
            </Button>
            {status && (
              <div className={`mt-2 text-center p-3 rounded-md ${
                status.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' :
                status.startsWith('❌') ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {status}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Generated Files Preview */}
      {generatedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Files ({generatedFiles.length})</CardTitle>
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
              className="h-72 font-mono bg-muted text-sm"
              placeholder="File content will be displayed here."
            />
            <div className="flex gap-4">
              <Button 
                onClick={handleDownloadZip} 
                disabled={!canDownload}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download ZIP
              </Button>
              <Button 
                onClick={handleUploadToGrader} 
                disabled={!canUpload}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" /> 
                    Upload to Grader
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Problems Management */}
      <Card>
        <CardHeader>
          <CardTitle>Problems in Storage ({untaggedProblems.length})</CardTitle>
          <CardDescription>Search, filter, and manage problems in storage. Sync them with SearchSmith for tagging.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="space-y-4 mb-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search problems by name, ID, or tags..."
                value={searchTermRaw}
                onChange={(e) => setSearchTermRaw(e.target.value)}
                className="pl-10 pr-4"
                aria-label="Search problems"
              />
              {searchTermRaw && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTermRaw("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  aria-label="Clear search"
                >
                  ×
                </Button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              
              {/* Tag Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={tagFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagFilter('all')}
                  className="h-8"
                >
                  All ({filterStats.total})
                </Button>
                <Button
                  variant={tagFilter === 'tagged' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagFilter('tagged')}
                  className="h-8"
                >
                  Tagged ({filterStats.tagged})
                </Button>
                <Button
                  variant={tagFilter === 'untagged' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagFilter('untagged')}
                  className="h-8"
                >
                  Untagged ({filterStats.untagged})
                </Button>
              </div>

              {/* Clear Filters */}
              {(searchTermRaw || tagFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8"
                >
                  Clear filters
                </Button>
              )}

              {/* Refresh Button */}
              <div className="ml-auto">
                <Button 
                  onClick={() => fetchAllProblemsWithStatus()} 
                  disabled={isLoadingUntagged}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingUntagged ? 'animate-spin' : ''}`} />
                  {isLoadingUntagged ? "Syncing..." : "Sync"}
                </Button>
              </div>
            </div>

            {/* Filter Description */}
            <div className="text-sm text-gray-600">
              {filterDescription}
            </div>
          </div>

          {/* Problems Table */}
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
                ) : filteredProblems.length > 0 ? (
                  filteredProblems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell className="font-mono text-sm">{problem.id}</TableCell>
                      <TableCell>{problem.name}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={problem.difficulty}
                          onChange={(e) => handleDifficultyChange(problem.id, e.target.value)}
                          disabled={problem.is_tagged || problem.isTagging || problem.isDeleting}
                          className="w-20 text-sm"
                          min={100}
                          max={3500}
                          aria-label={`Difficulty for problem ${problem.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        {problem.tags && problem.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {problem.tags.map((tag, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No tags</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {problem.is_tagged ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Tagged
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            Untagged
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleTag(problem)} 
                            disabled={problem.is_tagged || problem.isTagging || problem.isDeleting}
                            aria-label={`Tag problem ${problem.name}`}
                          >
                            {problem.isTagging ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            Tag
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteProblem(problem.id)}
                            disabled={problem.isTagging || problem.isDeleting}
                            aria-label={`Delete problem ${problem.name}`}
                          >
                            {problem.isDeleting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      <div className="flex flex-col items-center gap-3 text-gray-500">
                        <AlertCircle className="h-8 w-8" />
                        <div className="space-y-1">
                          <p className="font-medium">
                            {untaggedProblems.length === 0 
                              ? "No problems found in storage" 
                              : "No problems match your filters"}
                          </p>
                          {(searchTermRaw || tagFilter !== 'all') && untaggedProblems.length > 0 && (
                            <p className="text-sm">
                              Try adjusting your search term or filters
                            </p>
                          )}
                        </div>
                        {(searchTermRaw || tagFilter !== 'all') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={clearFilters}
                            className="mt-2"
                          >
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
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