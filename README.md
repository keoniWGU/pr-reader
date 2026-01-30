# GitHub PR Viewer

A command-line tool for fetching and displaying GitHub pull requests with advanced filtering, sorting, and caching capabilities.

## Features

- 🔐 Secure GitHub API authentication using Personal Access Tokens
- 📄 Automatic pagination handling for large repositories
- 💾 Intelligent in-memory caching with TTL (5 minutes default)
- 🎨 Multiple display formats: compact, detailed, and JSON
- 🔍 Advanced filtering by author, labels, and comment count
- 🔄 Flexible sorting options (date, comments, title)
- ⚡ Rate limit monitoring and management
- 🎯 TypeScript for type safety and developer experience
- ✅ Comprehensive test coverage (70%+ across units)

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- A GitHub Personal Access Token with `public_repo` read access

### Setup

1. Clone or download this repository:
```bash
cd orion-interview
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your GitHub token:
```bash
cp .env.example .env
# Edit .env and add your token:
# GITHUB_TOKEN=your_token_here
```

Generate a token at: https://github.com/settings/tokens (select "public_repo" scope for read access)

4. Build the project:
```bash
npm run build
```

## Usage

### Basic Command

Fetch open pull requests from a repository:

```bash
npm start fetch vercel/next.js
```

Or using the compiled version:

```bash
node dist/index.js fetch vercel/next.js
```

### Display Formats

**Compact view (default):**
```bash
npm start fetch vercel/next.js --format compact
```

**Detailed view with full information:**
```bash
npm start fetch vercel/next.js --format detailed
```

**JSON output for programmatic use:**
```bash
npm start fetch vercel/next.js --format json
```

### Filtering & Sorting

**Filter by author:**
```bash
npm start fetch vercel/next.js --author timneutkens
```

**Filter by label:**
```bash
npm start fetch vercel/next.js --label bug
```

**Filter by minimum comments:**
```bash
npm start fetch vercel/next.js --min-comments 10
```

**Sort by different fields:**
```bash
npm start fetch vercel/next.js --sort comments --direction desc
npm start fetch vercel/next.js --sort created --direction asc
```

**Combine multiple options:**
```bash
npm start fetch vercel/next.js --format detailed --author timneutkens --sort comments --direction desc
```

### Pagination Control

```bash
# Fetch more pages (default is 5)
npm start fetch vercel/next.js --max-pages 10

# Adjust results per page (default is 30)
npm start fetch vercel/next.js --per-page 50
```

### State Options

```bash
# Open PRs (default)
npm start fetch vercel/next.js --state open

# Closed PRs
npm start fetch vercel/next.js --state closed

# All PRs
npm start fetch vercel/next.js --state all
```

### Cache Management

**View cache statistics:**
```bash
npm start cache --stats
```

**Clear the cache:**
```bash
npm start cache --clear
```

### Rate Limit

**Check API rate limit status:**
```bash
npm start rate-limit
```

## Development

### Run in Development Mode

```bash
npm run dev fetch vercel/next.js
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Linting & Formatting

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Type checking
npm run type-check
```

## Project Structure

```
orion-interview/
├── src/
│   ├── index.ts                 # CLI entry point and command definitions
│   ├── services/
│   │   ├── github.service.ts    # GitHub API integration
│   │   └── cache.service.ts     # In-memory caching with TTL
│   ├── types/
│   │   └── github.types.ts      # TypeScript type definitions
│   ├── utils/
│   │   ├── formatter.ts         # Display formatting utilities
│   │   └── validator.ts         # Input validation
│   └── __tests__/               # Unit tests
│       ├── cache.service.test.ts
│       ├── validator.test.ts
│       └── formatter.test.ts
├── dist/                        # Compiled JavaScript output
├── .env.example                 # Environment variable template
├── tsconfig.json                # TypeScript configuration
├── jest.config.js               # Jest testing configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

## Architecture & Design Decisions

### Technology Choices

1. **TypeScript**: Provides type safety, better IDE support, and catches errors at compile time rather than runtime.

2. **CLI over Web App**: Given the 2-3 hour time constraint, a CLI application allows focus on core functionality (API integration, pagination, caching) without UI complexity.

3. **@octokit/rest**: Official GitHub SDK provides a stable, well-maintained API client with TypeScript support and automatic rate limit handling.

4. **Commander.js**: Industry-standard CLI framework with excellent developer experience for building command-line interfaces.

5. **Chalk & Ora**: Enhance user experience with colored output and loading indicators, making the CLI more professional and user-friendly.

### SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - `GitHubService`: Handles only GitHub API interactions
   - `CacheService`: Manages only caching logic
   - `Formatter`: Responsible only for display formatting
   - `Validator`: Handles only input validation

2. **Open/Closed Principle (OCP)**
   - Formatter supports multiple display formats through strategy pattern
   - Easy to add new formats without modifying existing code

3. **Liskov Substitution Principle (LSP)**
   - Services implement consistent interfaces that can be extended or mocked

4. **Interface Segregation Principle (ISP)**
   - TypeScript interfaces are specific to their use cases (FetchPRsOptions, FilterOptions, SortOptions)
   - No forced dependencies on unused methods

5. **Dependency Inversion Principle (DIP)**
   - Services depend on abstractions (TypeScript interfaces) rather than concrete implementations
   - Easy to mock for testing

### Key Design Patterns

1. **Singleton Pattern**: `CacheService` ensures a single global cache instance

2. **Strategy Pattern**: Multiple formatting strategies (compact, detailed, JSON)

3. **Dependency Injection**: Services accept dependencies through constructors for testability

### Caching Strategy

- **In-memory cache** with 5-minute TTL balances freshness with API rate limit conservation
- Cache keys include repository name and query parameters to avoid stale data
- Automatic expiration prevents memory leaks in long-running sessions

### Pagination Implementation

- Correctly handles GitHub's Link header for pagination
- Configurable max pages to prevent excessive API calls
- Clear feedback when more results are available

### Error Handling

- Comprehensive error messages for common scenarios (404, 401, 403, rate limits)
- Token validation before making API calls
- Graceful degradation with helpful user guidance

### Testing Strategy

- **Unit tests** for core services (cache, validator, formatter)
- **Test coverage threshold**: 70% minimum across all metrics
- **Mocking strategy**: External dependencies mocked to ensure fast, isolated tests
- **Edge cases covered**: Expiration, validation, filtering, sorting

## What Could Be Improved With More Time

### High Priority Enhancements

1. **Persistent Caching**
   - Use Redis or file-based caching for persistence across sessions
   - Implement cache warming strategies

2. **Enhanced Error Recovery**
   - Automatic retry logic with exponential backoff
   - Better handling of transient network failures

3. **Integration Tests**
   - End-to-end tests against real GitHub API (with test fixtures)
   - CLI integration tests using child process execution

4. **Performance Optimizations**
   - Parallel API requests for multiple repositories
   - Stream processing for very large result sets
   - Incremental updates instead of full refreshes

### Medium Priority Features

5. **Web Dashboard**
   - React-based UI for visual PR browsing
   - Real-time updates via webhooks
   - Interactive filtering and sorting

6. **MCP/Agent Integration**
   - Expose functionality as structured tools for AI agents
   - Natural language query processing
   - LLM-powered PR summarization

7. **Advanced Filtering**
   - Complex query language (e.g., SQL-like syntax)
   - Regex support for title/body searches
   - Date range filtering

8. **Export Capabilities**
   - Export to CSV, Excel, PDF formats
   - Scheduled reports via email
   - Custom templates for different stakeholders

### Lower Priority Improvements

9. **Configuration System**
   - User preferences file (.ghprviewerrc)
   - Default repository lists
   - Custom display templates

10. **Monitoring & Analytics**
    - Usage statistics tracking
    - Performance metrics
    - API quota optimization insights

11. **Multi-Repository Support**
    - Aggregate PRs from multiple repos
    - Organization-wide PR dashboard
    - Cross-repository PR dependencies visualization

12. **Additional GitHub Features**
    - PR reviews and review comments
    - CI/CD status checks
    - File changes diff preview
    - PR timeline visualization

## Performance Considerations

- **API Rate Limits**: GitHub allows 5,000 requests/hour for authenticated users. Caching reduces unnecessary calls.
- **Memory Usage**: In-memory cache is suitable for typical use. For high-volume scenarios, consider Redis.
- **Network Efficiency**: Pagination with configurable page size balances completeness with speed.

## Security Considerations

- **Token Storage**: Never commit tokens to version control. Use environment variables or secure secret management.
- **Input Validation**: All user inputs are validated and sanitized to prevent injection attacks.
- **Read-Only Access**: Token only needs `public_repo` scope for read access to public repositories.
- **Error Messages**: Avoid leaking sensitive information in error messages.

## Testing

The project includes comprehensive unit tests covering:

- ✅ Cache service (singleton, TTL, CRUD operations)
- ✅ Input validation (repo format, tokens, display options)
- ✅ Formatter utilities (filtering, sorting, formatting)

Run tests with:
```bash
npm test
```

Current coverage exceeds 70% across all metrics (branches, functions, lines, statements).

## Time Spent

- **Planning & Setup**: 20 minutes
- **Core Implementation**: 60 minutes
  - GitHub service with pagination: 20 min
  - Cache service: 10 min
  - CLI interface: 15 min
  - Formatting utilities: 15 min
- **Testing**: 30 minutes
- **Documentation**: 20 minutes
- **Total**: ~2.5 hours

## License

ISC

## Author

Technical interview exercise for Orion startup position.
