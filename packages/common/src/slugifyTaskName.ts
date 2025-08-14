export function slugifyTaskName(taskName: string): string {
  return taskName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
} 