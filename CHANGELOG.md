# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-07-25

### Added
- **🧠 Intelligent Syntax Validation** for edit_file tool
- **📝 File Type Detection** - Automatic detection based on file extensions
- **🔍 Smart Error Reporting** - Line/column precision with fix suggestions
- **🎯 Model-friendly Feedback** - Detailed validation messages to help AI assistants
- **⚙️ Enhanced Parameters** - Added `skipValidation` option for edge cases

### Enhanced
- **edit_file tool** now validates syntax for:
  - JavaScript/JSX - Bracket matching, control structure validation
  - TypeScript/TSX - Type annotation and interface validation  
  - JSON - Complete syntax validation with position info
  - YAML - Indentation and structure validation
  - XML/HTML - Tag matching and structure validation
- **Error messages** now provide file-type specific suggestions
- **Validation feedback** helps AI models learn from syntax errors
- **Dry run mode** for safe preview of changes

### Fixed
- **False positives** in JavaScript validation patterns
- **Over-strict validation** that blocked valid code patterns
- **Generic error messages** replaced with specific, actionable feedback

## [1.0.0] - 2025-07-24

### Added
- **Enhanced MCP Filesystem Server** with all essential tools
- **Fixed glob pattern search** - properly supports `*pipeline*`, `*.js`, `**/*test*` patterns
- **Enhanced head+tail reading** - read first N and last M lines simultaneously
- **Advanced file editing** with git-style diff preview
- **Security features** including path validation and symlink protection
- **Atomic file operations** for data consistency
- **Shell command execution** within allowed directories
- **Comprehensive error handling** and input validation

### Fixed
- **Search patterns**: Now uses `minimatch` for proper glob pattern matching
- **Head+tail limitation**: Removed "Cannot specify both head and tail parameters" error
- **Case-insensitive search**: All search operations are now case-insensitive
- **Path traversal protection**: Enhanced security validation

### Enhanced
- **Multi-strategy pattern matching** for better search results
- **Debug logging** for troubleshooting search operations
- **Performance optimizations** for large directory operations
- **Better error messages** with detailed context

### Tools Included
- `read_file` - Enhanced with head/tail support
- `read_multiple_files` - Batch file reading
- `write_file` - Atomic file creation/overwriting
- `delete_file` - **NEW** Safe file/directory deletion with recursive option
- `edit_file` - Line-based editing with diff preview
- `search_files` - Fixed glob pattern search
- `list_directory` - Directory listing with file/dir indicators
- `create_directory` - Recursive directory creation
- `get_file_info` - Comprehensive file metadata
- `move_file` - Safe file/directory moving
- `run_command` - **NEW** Secure shell command execution within allowed directories
- `list_allowed_directories` - Security transparency

### Dependencies
- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `minimatch` - Glob pattern matching library
- `diff` - File diffing for edit operations
- `zod` - Runtime type checking and validation
- `zod-to-json-schema` - Schema conversion for MCP tools

### Security
- Restricted file operations to allowed directories only
- Symlink protection prevents path traversal attacks
- Input validation using Zod schemas
- Atomic file operations prevent race conditions
