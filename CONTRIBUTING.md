# Contributing to MCP Server Filesystem

Thank you for your interest in contributing to MCP Server Filesystem! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn package manager
- Basic understanding of Model Context Protocol (MCP)

### Development Setup

1. **Fork and clone the repository:**
```bash
git clone https://github.com/redf0x1/mcp-server-filesystem.git
cd mcp-server-filesystem
```

2. **Install dependencies:**
```bash
npm install
```

3. **Test the server:**
```bash
npm start
```

## 🛠️ Development Guidelines

### Code Style
- Use ES modules (import/export)
- Follow existing code formatting
- Add JSDoc comments for new functions
- Use meaningful variable and function names

### Testing
- Test your changes with a real MCP client
- Ensure all existing functionality still works
- Add demo files to `workspace/` if needed for testing new features

### Security Considerations
- All file operations must respect allowed directories
- Validate all inputs using Zod schemas
- Use atomic operations for file writes
- Never expose sensitive system information

## 📝 How to Contribute

### Reporting Bugs
1. Check existing issues first
2. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Node.js version, MCP client)

### Suggesting Features
1. Open an issue with the "enhancement" label
2. Describe the feature and its use case
3. Explain how it would benefit users
4. Consider backward compatibility

### Submitting Changes

1. **Create a feature branch:**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes:**
   - Follow the coding standards
   - Update documentation if needed
   - Test thoroughly

3. **Commit your changes:**
```bash
git commit -m "feat: add awesome new feature

- Detailed description of what was added
- Why this change was needed
- Any breaking changes or special notes"
```

4. **Push and create a pull request:**
```bash
git push origin feature/your-feature-name
```

### Commit Message Guidelines
We follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or modifying tests
- `chore:` - Maintenance tasks

## 🎯 Areas for Contribution

### High Priority
- Performance optimizations for large directories
- Additional file operation tools
- Better error messages and debugging
- Cross-platform compatibility improvements

### Medium Priority
- Additional glob pattern features
- File watching capabilities
- Compression/decompression tools
- Symbolic link improvements

### Documentation
- More usage examples
- API documentation
- Video tutorials
- MCP client integration guides

## 🧪 Testing

### Manual Testing
1. Start the server: `npm start`
2. Connect with your MCP client
3. Test the specific functionality you changed
4. Verify existing features still work

### Common Test Scenarios
- File reading with various head/tail combinations
- Glob pattern search with different patterns
- File editing with diff preview
- Command execution in allowed directories
- Error handling for invalid paths

## 📋 Pull Request Checklist

Before submitting a pull request, ensure:

- [ ] Code follows the existing style and patterns
- [ ] All new functions have JSDoc documentation
- [ ] Changes are tested with a real MCP client
- [ ] No breaking changes (or clearly documented)
- [ ] README updated if needed
- [ ] CHANGELOG updated for significant changes
- [ ] Commit messages follow conventional format

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow GitHub community guidelines

## 💡 Getting Help

- Open an issue for questions
- Check existing documentation
- Look at the code examples in `workspace/`
- Review the MCP documentation: https://modelcontextprotocol.io/

Thank you for contributing! 🎉
