"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyTaskName = slugifyTaskName;
exports.uniqueSlugifyTaskName = uniqueSlugifyTaskName;
/**
 * Utility function to create consistent task name slugs across the application.
 * Removes common prefixes like 'text_' or 'task_generated_', converts to lowercase,
 * replaces non-alphanumeric characters with hyphens, and enforces length limits.
 */
function slugifyTaskName(input) {
    if (!input)
        return 'unnamed-task';
    return input
        .trim()
        .replace(/^(text_|task_generated_)/i, '') // Remove legacy prefixes
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanum with hyphen
        .replace(/^-+|-+$/g, '') // Trim hyphens from start/end
        .replace(/--+/g, '-') // Collapse multiple hyphens
        .slice(0, 50) || 'unnamed-task';
}
/**
 * Check if a task name already exists in a list and generate a unique name if needed
 */
function uniqueSlugifyTaskName(input, existingNames) {
    const baseSlug = slugifyTaskName(input);
    if (!existingNames.includes(baseSlug)) {
        return baseSlug;
    }
    // Find next available number
    let counter = 1;
    let uniqueSlug = `${baseSlug}-${counter}`;
    while (existingNames.includes(uniqueSlug)) {
        counter++;
        uniqueSlug = `${baseSlug}-${counter}`;
    }
    return uniqueSlug;
}
