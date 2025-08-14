"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyTaskName = slugifyTaskName;
function slugifyTaskName(taskName) {
    return taskName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "");
}
