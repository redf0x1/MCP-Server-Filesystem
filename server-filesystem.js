#!/usr/bin/env node

/**
 * MCP Server Filesystem - Enhanced filesystem server for Model Context Protocol
 * 
 * Features:
 * - Fixed glob pattern search with minimatch
 * - Head+tail file reading support 
 * - Advanced file editing with diff preview
 * - Secure command execution
 * - Comprehensive file operations
 * 
 * @author redf0x1
 * @license MIT
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
    CallToolRequestSchema, 
    ListToolsRequestSchema, 
    ToolSchema 
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from 'os';
import { randomBytes } from 'crypto';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { minimatch } from 'minimatch';
import { createTwoFilesPatch } from 'diff';

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: server-filesystem <allowed-directory> [additional-directories...]");
    console.error("Example: node server-filesystem.js /home/user/projects /workspace/shared");
    process.exit(1);
}

// Normalize all paths consistently
function normalizePath(p) {
    return path.normalize(p);
}

function expandHome(filepath) {
    if (filepath.startsWith('~/') || filepath === '~') {
        return path.join(os.homedir(), filepath.slice(1));
    }
    return filepath;
}

// Store allowed directories in normalized and resolved form
const allowedDirectories = await Promise.all(args.map(async (dir) => {
    const expanded = expandHome(dir);
    const absolute = path.resolve(expanded);
    try {
        // Resolve symlinks in allowed directories during startup
        const resolved = await fs.realpath(absolute);
        return normalizePath(resolved);
    } catch (error) {
        // If we can't resolve (doesn't exist), use the normalized absolute path
        return normalizePath(absolute);
    }
}));

// Validate that all directories exist and are accessible
await Promise.all(args.map(async (dir) => {
    try {
        const stats = await fs.stat(expandHome(dir));
        if (!stats.isDirectory()) {
            console.error(`Error: ${dir} is not a directory`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`Error accessing directory ${dir}:`, error);
        process.exit(1);
    }
}));

// Security utilities
function isPathWithinAllowedDirectories(requestedPath, allowedDirs) {
    return allowedDirs.some(allowedDir => {
        const relative = path.relative(allowedDir, requestedPath);
        // Allow exact match (relative === '') or paths within the directory
        return (relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative)));
    });
}

async function validatePath(requestedPath) {
    const expandedPath = expandHome(requestedPath);
    const absolute = path.isAbsolute(expandedPath)
        ? path.resolve(expandedPath)
        : path.resolve(process.cwd(), expandedPath);
    const normalizedRequested = normalizePath(absolute);

    // Check if path is within allowed directories
    const isAllowed = isPathWithinAllowedDirectories(normalizedRequested, allowedDirectories);
    if (!isAllowed) {
        throw new Error(`Access denied - path outside allowed directories: ${absolute} not in ${allowedDirectories.join(', ')}`);
    }

    // Handle symlinks by checking their real path
    try {
        const realPath = await fs.realpath(absolute);
        const normalizedReal = normalizePath(realPath);
        if (!isPathWithinAllowedDirectories(normalizedReal, allowedDirectories)) {
            throw new Error(`Access denied - symlink target outside allowed directories: ${realPath} not in ${allowedDirectories.join(', ')}`);
        }
        return realPath;
    } catch (error) {
        // For new files that don't exist yet, verify parent directory
        if (error.code === 'ENOENT') {
            const parentDir = path.dirname(absolute);
            try {
                const realParentPath = await fs.realpath(parentDir);
                const normalizedParent = normalizePath(realParentPath);
                if (!isPathWithinAllowedDirectories(normalizedParent, allowedDirectories)) {
                    throw new Error(`Access denied - parent directory outside allowed directories: ${realParentPath} not in ${allowedDirectories.join(', ')}`);
                }
                return absolute;
            } catch {
                throw new Error(`Parent directory does not exist: ${parentDir}`);
            }
        }
        throw error;
    }
}

// Schema definitions
const ReadFileArgsSchema = z.object({
    path: z.string(),
    tail: z.number().optional().describe('If provided, returns only the last N lines of the file'),
    head: z.number().optional().describe('If provided, returns only the first N lines of the file')
});

const ReadMultipleFilesArgsSchema = z.object({
    paths: z.array(z.string()),
});

const WriteFileArgsSchema = z.object({
    path: z.string(),
    content: z.string(),
});

const DeleteFileArgsSchema = z.object({
    path: z.string(),
    recursive: z.boolean().optional().default(false).describe('If true, delete directories recursively')
});

const CreateDirectoryArgsSchema = z.object({
    path: z.string(),
});

const ListDirectoryArgsSchema = z.object({
    path: z.string(),
});

const SearchFilesArgsSchema = z.object({
    path: z.string(),
    pattern: z.string(),
    excludePatterns: z.array(z.string()).optional().default([])
});

const GetFileInfoArgsSchema = z.object({
    path: z.string(),
});

const MoveFileArgsSchema = z.object({
    source: z.string(),
    destination: z.string(),
});

const EditOperation = z.object({
    oldText: z.string().describe('Text to search for - must match exactly'),
    newText: z.string().describe('Text to replace with')
});

const EditFileArgsSchema = z.object({
    path: z.string(),
    edits: z.array(EditOperation),
    dryRun: z.boolean().default(false).describe('Preview changes using git-style diff format')
});

const RunCommandArgsSchema = z.object({
    command: z.string().describe('The shell command to execute'),
    workingDirectory: z.string().optional().describe('Working directory for the command (default: first allowed directory)'),
    timeout: z.number().optional().default(30000).describe('Timeout in milliseconds (default: 30 seconds)'),
    includeStderr: z.boolean().optional().default(true).describe('Include stderr in output')
});

// Helper functions
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i === 0) return `${bytes} ${units[i]}`;
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

// FIXED: Improved search files function với proper glob pattern matching
async function searchFiles(rootPath, pattern, excludePatterns = []) {
    const results = [];
    
    console.error(`🔍 Searching in: ${rootPath}`);
    console.error(`📝 Pattern: ${pattern}`);
    console.error(`🚫 Exclude patterns: ${excludePatterns.join(', ')}`);
    
    async function search(currentPath) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                
                try {
                    // Validate each path before processing
                    await validatePath(fullPath);
                    
                    // Get relative path for pattern matching
                    const relativePath = path.relative(rootPath, fullPath);
                    
                    // Check if path matches any exclude pattern
                    const shouldExclude = excludePatterns.some(excludePattern => {
                        const globPattern = excludePattern.includes('*') ? excludePattern : `**/${excludePattern}/**`;
                        return minimatch(relativePath, globPattern, { dot: true });
                    });
                    
                    if (shouldExclude) {
                        continue;
                    }
                    
                    // FIXED: Enhanced glob pattern matching với nhiều strategy
                    let isMatch = false;
                    
                    // Strategy 1: Match exact filename
                    isMatch = minimatch(entry.name, pattern, { 
                        nocase: true,
                        dot: true
                    });
                    
                    // Strategy 2: Match relative path from root
                    if (!isMatch) {
                        isMatch = minimatch(relativePath, pattern, { 
                            nocase: true, 
                            dot: true 
                        });
                    }
                    
                    // Strategy 3: Match với full path (cho complex patterns)
                    if (!isMatch) {
                        isMatch = minimatch(fullPath, pattern, { 
                            nocase: true, 
                            dot: true 
                        });
                    }
                    
                    // Strategy 4: Match patterns với partial paths
                    if (!isMatch && pattern.includes('*')) {
                        // Split pattern and check each part
                        const patternParts = pattern.split('*').filter(p => p.length > 0);
                        if (patternParts.length > 1) {
                            isMatch = patternParts.every(part => 
                                entry.name.toLowerCase().includes(part.toLowerCase()) ||
                                relativePath.toLowerCase().includes(part.toLowerCase())
                            );
                        }
                    }
                    
                    if (isMatch) {
                        results.push(fullPath);
                        console.error(`✅ Found match: ${fullPath}`);
                    }
                    
                    // Recursively search directories
                    if (entry.isDirectory()) {
                        await search(fullPath);
                    }
                    
                } catch (error) {
                    // Skip invalid paths during search
                    console.error(`⚠️ Skipping ${fullPath}: ${error.message}`);
                    continue;
                }
            }
        } catch (error) {
            console.error(`❌ Error reading directory ${currentPath}: ${error.message}`);
        }
    }
    
    await search(rootPath);
    console.error(`📊 Total matches found: ${results.length}`);
    return results;
}

// File editing and diffing utilities
function normalizeLineEndings(text) {
    return text.replace(/\r\n/g, '\n');
}

function createUnifiedDiff(originalContent, newContent, filepath = 'file') {
    // Ensure consistent line endings for diff
    const normalizedOriginal = normalizeLineEndings(originalContent);
    const normalizedNew = normalizeLineEndings(newContent);
    return createTwoFilesPatch(filepath, filepath, normalizedOriginal, normalizedNew, 'original', 'modified');
}

async function applyFileEdits(filePath, edits, dryRun = false) {
    // Read file content and normalize line endings
    const content = normalizeLineEndings(await fs.readFile(filePath, 'utf-8'));
    
    // Apply edits sequentially
    let modifiedContent = content;
    for (const edit of edits) {
        const normalizedOld = normalizeLineEndings(edit.oldText);
        const normalizedNew = normalizeLineEndings(edit.newText);
        
        // If exact match exists, use it
        if (modifiedContent.includes(normalizedOld)) {
            modifiedContent = modifiedContent.replace(normalizedOld, normalizedNew);
            continue;
        }
        
        // Otherwise, try line-by-line matching with flexibility for whitespace
        const oldLines = normalizedOld.split('\n');
        const contentLines = modifiedContent.split('\n');
        let matchFound = false;
        
        for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
            const potentialMatch = contentLines.slice(i, i + oldLines.length);
            
            // Compare lines with normalized whitespace
            const isMatch = oldLines.every((oldLine, j) => {
                const contentLine = potentialMatch[j];
                return oldLine.trim() === contentLine.trim();
            });
            
            if (isMatch) {
                // Preserve original indentation of first line
                const originalIndent = contentLines[i].match(/^\s*/)?.[0] || '';
                const newLines = normalizedNew.split('\n').map((line, j) => {
                    if (j === 0) return originalIndent + line.trimStart();
                    // For subsequent lines, try to preserve relative indentation
                    const oldIndent = oldLines[j]?.match(/^\s*/)?.[0] || '';
                    const newIndent = line.match(/^\s*/)?.[0] || '';
                    if (oldIndent && newIndent) {
                        const relativeIndent = newIndent.length - oldIndent.length;
                        return originalIndent + ' '.repeat(Math.max(0, relativeIndent)) + line.trimStart();
                    }
                    return line;
                });
                
                contentLines.splice(i, oldLines.length, ...newLines);
                modifiedContent = contentLines.join('\n');
                matchFound = true;
                break;
            }
        }
        
        if (!matchFound) {
            throw new Error(`Could not find exact match for edit:\n${edit.oldText}`);
        }
    }
    
    // Create unified diff
    const diff = createUnifiedDiff(content, modifiedContent, filePath);
    
    // Format diff with appropriate number of backticks
    let numBackticks = 3;
    while (diff.includes('`'.repeat(numBackticks))) {
        numBackticks++;
    }
    const formattedDiff = `${'`'.repeat(numBackticks)}diff\n${diff}${'`'.repeat(numBackticks)}\n\n`;
    
    if (!dryRun) {
        // Security: Use atomic rename to prevent race conditions where symlinks
        // could be created between validation and write. Rename operations
        // replace the target file atomically and don't follow symlinks.
        const tempPath = `${filePath}.${randomBytes(16).toString('hex')}.tmp`;
        try {
            await fs.writeFile(tempPath, modifiedContent, 'utf-8');
            await fs.rename(tempPath, filePath);
        } catch (error) {
            try {
                await fs.unlink(tempPath);
            } catch { }
            throw error;
        }
    }
    
    return formattedDiff;
}

// Command execution utility
async function runCommand(command, workingDirectory, timeout = 30000, includeStderr = true) {
    const execAsync = promisify(exec);
    
    // Validate working directory
    let cwd = workingDirectory;
    if (!cwd) {
        cwd = allowedDirectories[0]; // Use first allowed directory as default
    } else {
        // Validate that working directory is within allowed directories
        await validatePath(cwd);
    }
    
    console.error(`🔧 Running command: ${command}`);
    console.error(`📁 Working directory: ${cwd}`);
    console.error(`⏰ Timeout: ${timeout}ms`);
    
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: cwd,
            timeout: timeout,
            maxBuffer: 1024 * 1024 * 5, // 5MB buffer
            encoding: 'utf8'
        });
        
        let output = '';
        if (stdout) {
            output += `📤 STDOUT:\n${stdout}`;
        }
        
        if (includeStderr && stderr) {
            if (output) output += '\n\n';
            output += `📢 STDERR:\n${stderr}`;
        }
        
        if (!output) {
            output = '✅ Command executed successfully with no output';
        }
        
        console.error(`✅ Command completed successfully`);
        return output;
        
    } catch (error) {
        console.error(`❌ Command failed: ${error.message}`);
        
        let errorOutput = `❌ ERROR: ${error.message}\n`;
        
        if (error.stdout) {
            errorOutput += `\n📤 STDOUT:\n${error.stdout}`;
        }
        
        if (error.stderr && includeStderr) {
            errorOutput += `\n📢 STDERR:\n${error.stderr}`;
        }
        
        if (error.code !== undefined) {
            errorOutput += `\n🔢 Exit code: ${error.code}`;
        }
        
        if (error.killed) {
            errorOutput += `\n⏰ Command was killed (likely due to timeout)`;
        }
        
        throw new Error(errorOutput);
    }
}

// Tool implementations
async function getFileStats(filePath) {
    const stats = await fs.stat(filePath);
    return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions: stats.mode.toString(8).slice(-3),
    };
}

// Server setup
const server = new Server({
    name: "mcp-server-filesystem",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "read_file",
                description: "Read the complete contents of a file from the file system. " +
                    "Handles various text encodings and provides detailed error messages " +
                    "if the file cannot be read. Use this tool when you need to examine " +
                    "the contents of a single file. Use the 'head' parameter to read only " +
                    "the first N lines of a file, or the 'tail' parameter to read only " +
                    "the last N lines of a file. Only works within allowed directories.",
                inputSchema: zodToJsonSchema(ReadFileArgsSchema),
            },
            {
                name: "read_multiple_files",
                description: "Read the contents of multiple files simultaneously. This is more " +
                    "efficient than reading files one by one when you need to analyze " +
                    "or compare multiple files. Each file's content is returned with its " +
                    "path as a reference. Failed reads for individual files won't stop " +
                    "the entire operation. Only works within allowed directories.",
                inputSchema: zodToJsonSchema(ReadMultipleFilesArgsSchema),
            },
            {
                name: "write_file",
                description: "Create a new file or completely overwrite an existing file with new content. " +
                    "Use with caution as it will overwrite existing files without warning. " +
                    "Handles text content with proper encoding. Only works within allowed directories.",
                inputSchema: zodToJsonSchema(WriteFileArgsSchema),
            },
            {
                name: "delete_file",
                description: "Delete a file or directory. Use with extreme caution as this operation " +
                    "cannot be undone. For directories, use the recursive flag to delete non-empty " +
                    "directories and their contents. Only works within allowed directories.",
                inputSchema: zodToJsonSchema(DeleteFileArgsSchema),
            },
            {
                name: "edit_file",
                description: "Make line-based edits to a text file. Each edit replaces exact line sequences " +
                    "with new content. Returns a git-style diff showing the changes made. " +
                    "Only works within allowed directories.",
                inputSchema: zodToJsonSchema(EditFileArgsSchema),
            },
            {
                name: "create_directory",
                description: "Create a new directory or ensure a directory exists. Can create multiple " +
                    "nested directories in one operation. If the directory already exists, " +
                    "this operation will succeed silently. Perfect for setting up directory " +
                    "structures for projects or ensuring required paths exist. Only works within allowed directories.",
                inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema),
            },
            {
                name: "list_directory",
                description: "Get a detailed listing of all files and directories in a specified path. " +
                    "Results clearly distinguish between files and directories with [FILE] and [DIR] " +
                    "prefixes. This tool is essential for understanding directory structure and " +
                    "finding specific files within a directory. Only works within allowed directories.",
                inputSchema: zodToJsonSchema(ListDirectoryArgsSchema),
            },
            {
                name: "search_files",
                description: "FIXED VERSION: Recursively search for files and directories matching a glob pattern. " +
                    "Now properly supports glob patterns like '*pipeline*', '*.js', '**/*test*', etc. " +
                    "Searches through all subdirectories from the starting path. The search " +
                    "is case-insensitive and supports advanced glob patterns. Returns full paths to all " +
                    "matching items. Great for finding files when you don't know their exact location. " +
                    "Only searches within allowed directories.",
                inputSchema: zodToJsonSchema(SearchFilesArgsSchema),
            },
            {
                name: "get_file_info",
                description: "Retrieve detailed metadata about a file or directory. Returns comprehensive " +
                    "information including size, creation time, last modified time, permissions, " +
                    "and type. This tool is perfect for understanding file characteristics " +
                    "without reading the actual content. Only works within allowed directories.",
                inputSchema: zodToJsonSchema(GetFileInfoArgsSchema),
            },
            {
                name: "move_file",
                description: "Move or rename files and directories. Can move files between directories " +
                    "and rename them in a single operation. If the destination exists, the " +
                    "operation will fail. Works across different directories and can be used " +
                    "for simple renaming within the same directory. Both source and destination must be within allowed directories.",
                inputSchema: zodToJsonSchema(MoveFileArgsSchema),
            },
            {
                name: "run_command",
                description: "Execute shell commands and return their output. This tool allows running " +
                    "terminal commands within the allowed directories. Useful for development tasks, " +
                    "file operations, git commands, package management, etc. Commands are executed " +
                    "with a timeout and in a secure environment. Both stdout and stderr are captured.",
                inputSchema: zodToJsonSchema(RunCommandArgsSchema),
            },
            {
                name: "list_allowed_directories",
                description: "Returns the list of directories that this server is allowed to access. " +
                    "Use this to understand which directories are available before trying to access files.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;

        switch (name) {
            case "read_file": {
                const parsed = ReadFileArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for read_file: ${parsed.error}`);
                }

                const validPath = await validatePath(parsed.data.path);
                
                const content = await fs.readFile(validPath, "utf-8");
                const lines = content.split('\n');
                
                if (parsed.data.head && parsed.data.tail) {
                    // Smart handling: return head lines + "..." + tail lines
                    const headLines = lines.slice(0, parsed.data.head);
                    const tailLines = lines.slice(-parsed.data.tail);
                    const separator = headLines.length + parsed.data.tail >= lines.length ? 
                        [] : ['... (middle content omitted) ...'];
                    const result = [...headLines, ...separator, ...tailLines].join('\n');
                    return {
                        content: [{ type: "text", text: result }],
                    };
                }

                if (parsed.data.tail) {
                    // Simple tail implementation
                    const tailLines = lines.slice(-parsed.data.tail);
                    return {
                        content: [{ type: "text", text: tailLines.join('\n') }],
                    };
                }

                if (parsed.data.head) {
                    // Simple head implementation
                    const headLines = lines.slice(0, parsed.data.head);
                    return {
                        content: [{ type: "text", text: headLines.join('\n') }],
                    };
                }

                return {
                    content: [{ type: "text", text: content }],
                };
            }

            case "read_multiple_files": {
                const parsed = ReadMultipleFilesArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for read_multiple_files: ${parsed.error}`);
                }

                const results = await Promise.all(parsed.data.paths.map(async (filePath) => {
                    try {
                        const validPath = await validatePath(filePath);
                        const content = await fs.readFile(validPath, "utf-8");
                        return `${filePath}:\n${content}\n`;
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        return `${filePath}: Error - ${errorMessage}`;
                    }
                }));

                return {
                    content: [{ type: "text", text: results.join("\n---\n") }],
                };
            }

            case "write_file": {
                const parsed = WriteFileArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for write_file: ${parsed.error}`);
                }

                const validPath = await validatePath(parsed.data.path);
                await fs.writeFile(validPath, parsed.data.content, "utf-8");
                return {
                    content: [{ type: "text", text: `Successfully wrote to ${parsed.data.path}` }],
                };
            }

            case "delete_file": {
                const parsed = DeleteFileArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for delete_file: ${parsed.error}`);
                }

                const validPath = await validatePath(parsed.data.path);
                
                // Check if file/directory exists
                try {
                    const stats = await fs.stat(validPath);
                    if (stats.isDirectory() && parsed.data.recursive) {
                        await fs.rm(validPath, { recursive: true, force: true });
                        return {
                            content: [{ type: "text", text: `Successfully deleted directory ${parsed.data.path} and its contents` }],
                        };
                    } else if (stats.isDirectory() && !parsed.data.recursive) {
                        // Try to delete empty directory
                        await fs.rmdir(validPath);
                        return {
                            content: [{ type: "text", text: `Successfully deleted empty directory ${parsed.data.path}` }],
                        };
                    } else {
                        // Delete file
                        await fs.unlink(validPath);
                        return {
                            content: [{ type: "text", text: `Successfully deleted file ${parsed.data.path}` }],
                        };
                    }
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        throw new Error(`File or directory does not exist: ${parsed.data.path}`);
                    } else if (error.code === 'ENOTEMPTY') {
                        throw new Error(`Directory is not empty: ${parsed.data.path}. Use recursive=true to delete non-empty directories.`);
                    }
                    throw error;
                }
            }

            case "edit_file": {
                const parsed = EditFileArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
                }

                const validPath = await validatePath(parsed.data.path);
                const result = await applyFileEdits(validPath, parsed.data.edits, parsed.data.dryRun);
                return {
                    content: [{ type: "text", text: result }],
                };
            }

            case "create_directory": {
                const parsed = CreateDirectoryArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for create_directory: ${parsed.error}`);
                }

                const validPath = await validatePath(parsed.data.path);
                await fs.mkdir(validPath, { recursive: true });
                return {
                    content: [{ type: "text", text: `Successfully created directory ${parsed.data.path}` }],
                };
            }

            case "list_directory": {
                const parsed = ListDirectoryArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
                }

                const validPath = await validatePath(parsed.data.path);
                const entries = await fs.readdir(validPath, { withFileTypes: true });
                const formatted = entries
                    .map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
                    .join("\n");

                return {
                    content: [{ type: "text", text: formatted }],
                };
            }

            case "search_files": {
                const parsed = SearchFilesArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for search_files: ${parsed.error}`);
                }

                const validPath = await validatePath(parsed.data.path);
                const results = await searchFiles(validPath, parsed.data.pattern, parsed.data.excludePatterns);
                
                return {
                    content: [{ 
                        type: "text", 
                        text: results.length > 0 ? results.join("\n") : "No matches found" 
                    }],
                };
            }

            case "get_file_info": {
                const parsed = GetFileInfoArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for get_file_info: ${parsed.error}`);
                }

                const validPath = await validatePath(parsed.data.path);
                const info = await getFileStats(validPath);
                return {
                    content: [{ 
                        type: "text", 
                        text: Object.entries(info)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join("\n") 
                    }],
                };
            }

            case "move_file": {
                const parsed = MoveFileArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for move_file: ${parsed.error}`);
                }

                const validSourcePath = await validatePath(parsed.data.source);
                const validDestPath = await validatePath(parsed.data.destination);
                await fs.rename(validSourcePath, validDestPath);
                return {
                    content: [{ type: "text", text: `Successfully moved ${parsed.data.source} to ${parsed.data.destination}` }],
                };
            }

            case "run_command": {
                const parsed = RunCommandArgsSchema.safeParse(args);
                if (!parsed.success) {
                    throw new Error(`Invalid arguments for run_command: ${parsed.error}`);
                }

                const output = await runCommand(
                    parsed.data.command,
                    parsed.data.workingDirectory,
                    parsed.data.timeout,
                    parsed.data.includeStderr
                );
                
                return {
                    content: [{ type: "text", text: output }],
                };
            }

            case "list_allowed_directories": {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Allowed directories:\n${allowedDirectories.map(dir => `- ${dir}`).join('\n')}` 
                    }],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            isError: true,
        };
    }
});

// Start the server
async function main() {
    console.error("🚀 MCP Server Filesystem starting...");
    console.error(`📁 Allowed directories: ${allowedDirectories.join(', ')}`);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error("✅ MCP Server Filesystem running!");
}

main().catch((error) => {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
});
