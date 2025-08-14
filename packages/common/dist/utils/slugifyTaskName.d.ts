/**
 * Utility function to create consistent task name slugs across the application.
 * Removes common prefixes like 'text_' or 'task_generated_', converts to lowercase,
 * replaces non-alphanumeric characters with hyphens, and enforces length limits.
 */
export declare function slugifyTaskName(input: string): string;
/**
 * Check if a task name already exists in a list and generate a unique name if needed
 */
export declare function uniqueSlugifyTaskName(input: string, existingNames: string[]): string;
