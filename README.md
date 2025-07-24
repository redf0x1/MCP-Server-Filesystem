# MCP Server Filesystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

An **enhanced** Model Context Protocol (MCP) filesystem server that fixes common limitations and adds powerful features missing from standard implementations.

## 🌟 Key Features

### ✅ **Fixed Issues**
- **Glob Pattern Search**: Properly supports patterns like `*pipeline*`, `*.js`, `**/*test*`
- **Head + Tail Support**: Read first N lines AND last M lines simultaneously (fixes "Cannot specify both head and tail parameters")
- **Enhanced File Operations**: Complete file editing with diff preview

### 🚀 **Core Tools**
- `read_file` - Read files with head/tail support
- `read_multiple_files` - Batch file reading
- `write_file` - Create/overwrite files
- `delete_file` - **NEW** Delete files/directories (with recursive option)
- `edit_file` - Line-based editing with diff preview
- `search_files` - **FIXED** glob pattern search
- `list_directory` - Directory listing
- `create_directory` - Directory creation
- `get_file_info` - File metadata
- `move_file` - File/directory moving
- `run_command` - **NEW** Shell command execution
- `list_allowed_directories` - Security transparency

## 🚀 Quick Start

### Installation Options

**Option 1: NPM Package (Recommended)**
```bash
# Install globally
npm install -g mcp-server-filesystem

# Or use with npx (no installation needed)
npx mcp-server-filesystem /path/to/your/workspace
```

**Option 2: From Source**
```bash
git clone https://github.com/redf0x1/mcp-server-filesystem.git
cd mcp-server-filesystem
npm install
```

### Usage

**With NPX (Recommended):**
```bash
npx mcp-server-filesystem /path/to/allowed/directory
```

**Direct execution:**
```bash
node server-filesystem.js /path/to/allowed/directory
```

**With npm script:**
```bash
npm start  # Uses ./workspace as default
```

### MCP Client Configurations

**Important:** The `cwd` (current working directory) parameter is **required** for proper server operation. It ensures the server starts from the correct directory and can resolve relative paths properly.

#### VS Code with MCP Extension

Add to your `mcp.json`:

**With NPX (Recommended):**
```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-server-filesystem",
        "/home/user/projects",
        "/home/user/documents"
      ]
    }
  },
  "inputs": []
}
```

**With local installation:**
```json
{
  "servers": {
    "filesystem": {
      "command": "node",
      "args": [
        "/path/to/server-filesystem.js",
        "/home/user/projects",
        "/home/user/documents"
      ],
      "cwd": "/path/to/mcp-server-filesystem"
    }
  },
  "inputs": []
}
```

#### Cursor IDE

Add to your MCP settings:

**With NPX:**
```json
{
  "mcp": {
    "servers": {
      "enhanced-filesystem": {
        "command": "npx",
        "args": [
          "-y",
          "mcp-server-filesystem",
          "/Users/username/workspace",
          "/Users/username/scripts"
        ]
      }
    }
  }
}
```

**With local installation:**
```json
{
  "mcp": {
    "servers": {
      "enhanced-filesystem": {
        "command": "node",
        "args": [
          "/path/to/server-filesystem.js",
          "/Users/username/workspace",
          "/Users/username/scripts"
        ],
        "cwd": "/path/to/mcp-server-filesystem"
      }
    }
  }
}
```

#### Cline (Claude for VSCode)

Configuration in settings:

**With NPX:**
```json
{
  "cline.mcp.servers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y", 
        "mcp-server-filesystem",
        "/workspace/current-project",
        "/workspace/shared-libs"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

**With local installation:**
```json
{
  "cline.mcp.servers": {
    "filesystem": {
      "command": "node",
      "args": [
        "/path/to/server-filesystem.js",
        "/workspace/current-project",
        "/workspace/shared-libs"
      ],
      "cwd": "/path/to/mcp-server-filesystem",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### Windsurf AI Editor

Add to MCP configuration:

```json
{
  "servers": {
    "filesystem-enhanced": {
      "command": "node",
      "args": [
        "/opt/mcp-tools/server-filesystem.js",
        "/home/developer/projects",
        "/tmp/workspace"
      ],
      "cwd": "/opt/mcp-tools",
      "timeout": 30000
    }
  }
}
```

#### Generic MCP Client

Standard configuration format:

```json
#### Generic MCP Client

**With NPX (Recommended):**
```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": [
          "-y",
          "mcp-server-filesystem",
          "/path/to/allowed/directory1",
          "/path/to/allowed/directory2"
        ]
      }
    }
  }
}
```

**With local installation:**
```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "node",
        "args": [
          "./server-filesystem.js",
          "/path/to/allowed/directory1",
          "/path/to/allowed/directory2"
        ],
        "cwd": "/path/to/server/directory"
      }
    }
  }
}
```

#### Docker Integration

For containerized environments:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--mount", "type=bind,src=/host/projects,dst=/container/projects",
        "--mount", "type=bind,src=/host/data,dst=/container/data,ro",
        "node:18-alpine",
        "sh", "-c",
        "npm install -g mcp-server-filesystem && mcp-server-filesystem /container/projects /container/data"
      ]
    }
  }
}
```

#### NPM Global Installation

Install globally for easier access:

```bash
npm install -g mcp-server-filesystem
mcp-server-filesystem /your/project/path
```

## 🛠️ Enhanced Features

### 1. **Smart Head + Tail Reading**

**Before (Standard):**
```json
{
  "path": "large-file.txt",
  "head": 10,
  "tail": 5
}
```
❌ **Error**: `Cannot specify both head and tail parameters simultaneously`

**After (Complete):**
```json
{
  "path": "large-file.txt", 
  "head": 10,
  "tail": 5
}
```
✅ **Result**:
```
Line 1: ...
Line 2: ...
...
Line 10: ...
... (middle content omitted) ...
Line 96: ...
Line 97: ...
...
Line 100: ...
```

### 2. **Fixed Glob Pattern Search**

**Before (Standard):**
```json
{
  "path": "/project",
  "pattern": "*config*"
}
```
❌ Only finds exact matches, ignores glob patterns

**After (Complete):**
```json
{
  "path": "/project", 
  "pattern": "*config*"
}
```
✅ **Finds**: `webpack.config.js`, `app-config.json`, `config/database.php`, etc.

**Supported patterns:**
- `*.js` - All JavaScript files
- `*test*` - Files containing "test"
- `**/*config*` - Config files in any subdirectory
- `src/**/*.ts` - TypeScript files in src/

### 3. **Advanced File Editing**

```json
{
  "path": "app.js",
  "edits": [
    {
      "oldText": "const port = 3000;",
      "newText": "const port = process.env.PORT || 3000;"
    }
  ],
  "dryRun": true
}
```

Returns git-style diff preview before applying changes.

### 4. **Secure Command Execution**

```json
{
  "command": "npm install lodash",
  "workingDirectory": "/workspace/project",
  "timeout": 30000,
  "includeStderr": true
}
```

Execute shell commands safely within allowed directories:
- **Git operations**: `git status`, `git add .`, `git commit`
- **Package management**: `npm install`, `pip install`, `composer install`
- **Build tools**: `webpack build`, `tsc`, `make`
- **File operations**: `find`, `grep`, `ls -la`

**Security features:**
- Commands run only in allowed directories
- Configurable timeout protection
- Both stdout and stderr capture
- Environment isolation

### 5. **Safe File/Directory Deletion**

```json
{
  "path": "/workspace/temp-file.txt"
}
```

Delete files safely:

```json
{
  "path": "/workspace/temp-directory",
  "recursive": true
}
```

Delete directories with contents:
- **Single files**: Safe file deletion with validation
- **Empty directories**: Remove empty directories only
- **Recursive deletion**: Remove directories and all contents (use with caution)
- **Error handling**: Clear messages for non-existent or protected files

## 📁 Project Structure

```
mcp-server-filesystem/
├── server-filesystem.js          # Main server file
├── package.json                  # Dependencies and scripts
├── mcp-config.json              # MCP configuration example
├── README.md                    # This file
└── workspace/                   # Demo workspace
    ├── demo.txt                 # Sample text file
    ├── deploy-pipeline.yml      # Sample YAML
    └── pipeline-config.js       # Sample JS config
```

## 🔧 Development

### Configuration Best Practices

**Always specify `cwd`:**
```json
{
  "servers": {
    "filesystem": {
      "command": "node",
      "args": ["/absolute/path/to/server-filesystem.js", "/workspace"],
      "cwd": "/absolute/path/to/server/directory"  // ⭐ Required!
    }
  }
}
```

**Why `cwd` is important:**
- Ensures server starts from correct directory
- Resolves relative paths properly
- Prevents "Cannot find module" errors
- Required for proper dependency loading

**Example working config:**
```json
{
  "servers": {
    "filesystem": {
      "command": "node",
      "args": [
        "/root/server-filesystem/server-filesystem.js",
        "/var/www/projects",
        "/home/user/documents"
      ],
      "cwd": "/root/server-filesystem"
    }
  }
}
```

### Local Development
```bash
npm run dev  # Starts server with ./workspace
```

### Common Usage Examples

**Web Development:**
```bash
node server-filesystem.js /home/user/websites /home/user/config
```

**Data Science:**
```bash
node server-filesystem.js /data/datasets /notebooks /scripts
```

**DevOps:**
```bash
node server-filesystem.js /infrastructure /deployments /monitoring
```

**Mobile Development:**
```bash
node server-filesystem.js /android-projects /ios-projects /shared-assets
```

### Testing Tools
Test individual tools using your MCP client or create custom test scripts.

## 🔒 Security

- **Path Validation**: All operations restricted to allowed directories
- **Symlink Protection**: Prevents symlink-based path traversal
- **Atomic Operations**: File writes use atomic rename for consistency
- **Input Sanitization**: All inputs validated with Zod schemas
- **Command Isolation**: Shell commands run with restricted permissions

## 🚨 Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check Node.js version
node --version  # Should be >=18.0.0

# Verify dependencies
npm install

# Check directory permissions
ls -la /path/to/allowed/directory
```

**"Cannot find module" error:**
- Verify the server file path in your config: `/path/to/server-filesystem.js`
- Ensure `cwd` points to the directory containing the server file
- Check file permissions: `ls -la /path/to/server-filesystem.js`

**Path access denied:**
- Ensure directories exist and are readable
- Check symlink targets are within allowed paths
- Verify absolute paths in configuration
- Make sure `cwd` is set correctly in your MCP configuration

**Glob patterns not working:**
```bash
# ✅ Correct patterns
"*.js"           # All JS files
"**/test/*"      # Test files in any subdirectory
"*config*"       # Files containing "config"

# ❌ Incorrect patterns
"*.js*"          # Too broad
"test"           # Too specific
```

### Performance Tips

- Use specific glob patterns to reduce search time
- Limit the number of allowed directories
- Use `head`/`tail` for large files instead of reading entire content
- Enable `excludePatterns` in search operations

## 📋 Requirements

- **Node.js**: 18.0.0 or higher
- **Dependencies**: 
  - `@modelcontextprotocol/sdk`
  - `minimatch` (for glob patterns)
  - `diff` (for file editing)
  - `zod` (for validation)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on top of the [Model Context Protocol](https://modelcontextprotocol.io/)
- Inspired by the official MCP filesystem server
- Enhanced to solve real-world limitations

## 🆚 What's Different?

This server fixes several critical issues found in standard MCP filesystem implementations:

| Issue | Standard Behavior | ✅ Our Solution |
|-------|------------------|----------------|
| Glob patterns | `search_files` uses simple `includes()` | Uses `minimatch` for proper glob support |
| Head + Tail | "Cannot specify both parameters" error | Smart combination with separator |
| File editing | No diff preview | Git-style diff before applying changes |
| Command execution | Not available | Secure shell command execution |
| File deletion | Basic `unlink()` only | Safe deletion with recursive option and validation |
| Error handling | Basic error messages | Detailed context and troubleshooting |

**Performance improvements:**
- Multi-strategy pattern matching for better search results
- Atomic file operations for data consistency
- Memory-efficient head/tail reading for large files
- Safe recursive deletion with proper validation
- Debug logging for troubleshooting

**Additional features not found in standard implementations:**
- Combined head+tail reading for file previews
- Git-style diff preview before file edits
- Secure command execution within allowed directories
- Multiple glob pattern strategies for comprehensive search
- Enhanced error messages with context and solutions

---

**Note**: This server addresses specific limitations found in standard MCP filesystem implementations. If you need basic filesystem operations without the enhanced features, consider using the official `@modelcontextprotocol/server-filesystem` package.
