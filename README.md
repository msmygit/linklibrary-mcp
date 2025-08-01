# @msmygit/linklibrary-mcp
![NPM Downloads](https://img.shields.io/npm/d18m/%40msmygit%2Flinklibrary-mcp?style=plastic&logoColor=green&color=green&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40msmygit%2Flinklibrary-mcp)
![GitHub contributors](https://img.shields.io/github/contributors/msmygit/linklibrary-mcp)
![Static Badge](https://img.shields.io/badge/Contributors-Welcome-green?style=plastic&logoColor=green)
![NPM Last Update](https://img.shields.io/npm/last-update/%40msmygit%2Flinklibrary-mcp)
![NPM License](https://img.shields.io/npm/l/%40msmygit%2Flinklibrary-mcp)
![NPM Version](https://img.shields.io/npm/v/%40msmygit%2Flinklibrary-mcp)

A high-performance, production-ready Model Context Protocol (MCP) server that provides AI assistants with programmatic access to [LinkLibrary.ai](https://linklibrary.ai) bookmark management capabilities.

## 🚀 Features

### ✨ Core Features
- **🔐 Secure Authentication** - JWT-based authentication with automatic token refresh
- **📚 Bookmark Management** - Create, retrieve, and organize bookmarks with rich metadata
- **📁 Collections & Tags** - Manage bookmark organization with collections and tags
- **🔍 Advanced Search** - Powerful search with multiple filters and operators
- **📊 Analytics** - Get insights about your bookmark usage and patterns
- **🤖 AI Integration** - Works seamlessly with Claude Desktop, VSCode, and other MCP clients

### 🏗️ Architecture Features
- **⚡ High Performance** - In-memory caching with LRU eviction and TTL
- **🛡️ Rate Limiting** - Configurable rate limiting with sliding window
- **📈 Metrics Driven** - Comprehensive performance monitoring and logging
- **🔄 Retry Logic** - Automatic retry with exponential backoff
- **🔒 Error Handling** - Robust error handling with proper error types
- **🧪 Test Coverage** - Comprehensive test suite with mocking

## 🛠️ Installation

### For End Users

The package is published on npm and can be used directly with MCP clients:

```json
{
  "mcpServers": {
    "linklibrary-mcp": {
      "command": "npx",
      "args": ["-y", "@msmygit/linklibrary-mcp@latest"],
      "env": {
        "LL_USERNAME": "your_email@example.com",
        "LL_PASSWORD": "your_password"
      }
    }
  }
}
```

### For Developers

```bash
npm install @msmygit/linklibrary-mcp
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LL_USERNAME` | LinkLibrary.ai email address | - | Yes* |
| `LL_PASSWORD` | LinkLibrary.ai password | - | Yes* |
| `LL_TOKEN` | LinkLibrary.ai API token | - | Yes* |
| `LINKLIBRARY_API_URL` | API base URL | `https://api.linklibrary.ai/api/v1` | No |
| `API_TIMEOUT_MS` | API request timeout | `30000` | No |
| `API_MAX_RETRIES` | Maximum retry attempts | `3` | No |
| `CACHE_TTL_SECONDS` | Cache TTL in seconds | `300` | No |
| `CACHE_MAX_SIZE` | Maximum cache entries | `1000` | No |
| `RATE_LIMIT_REQUESTS` | Rate limit requests per window | `100` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `60000` | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `ENABLE_METRICS` | Enable performance metrics | `false` | No |

*Either `LL_USERNAME`/`LL_PASSWORD` or `LL_TOKEN` is required.

### MCP Client Configuration

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS/Linux) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "linklibrary-mcp": {
      "command": "npx",
      "args": ["-y", "@msmygit/linklibrary-mcp@latest"],
      "env": {
        "LL_USERNAME": "your_email@example.com",
        "LL_PASSWORD": "your_password",
        "ENABLE_METRICS": "true"
      }
    }
  }
}
```

#### VSCode

Add to your VSCode settings:

```json
{
  "mcp.servers": {
    "linklibrary-mcp": {
      "command": "npx",
      "args": ["-y", "@msmygit/linklibrary-mcp@latest"],
      "env": {
        "LL_USERNAME": "your_email@example.com",
        "LL_PASSWORD": "your_password"
      }
    }
  }
}
```

## 🛠️ Available Tools

### Authentication
- `authenticate` - Authenticate with LinkLibrary credentials

### Bookmark Management
- `get_links` - Retrieve bookmarks with filtering and pagination
- `create_link` - Create new bookmarks with metadata

### Organization
- `get_collections` - Retrieve user collections
- `get_tags` - Retrieve user tags

### Search & Analytics
- `search_advanced` - Advanced search with multiple filters
- `get_user_stats` - Get user statistics and insights

## 💡 Usage Examples

Once connected to your MCP client, you can ask:

- "Show me my recent bookmarks"
- "Create a bookmark for this article about AI"
- "Search for machine learning resources in my Development collection"
- "Show me my bookmark statistics for this month"
- "What are my most used tags?"

## 🏗️ Architecture

### Core Components

```
linklibrary-mcp/
├── src/
│   ├── types.ts              # TypeScript type definitions
│   ├── config.ts             # Configuration management
│   ├── server.ts             # Main MCP server implementation
│   ├── services/
│   │   ├── api-client.ts     # HTTP client with retry logic
│   │   └── auth-service.ts   # Authentication management
│   └── utils/
│       ├── logger.ts         # Structured logging with metrics
│       ├── cache.ts          # In-memory LRU cache
│       └── rate-limiter.ts   # Rate limiting implementation
├── scripts/
│   └── build.js              # Build script
├── tests/
│   └── server.test.ts        # Comprehensive test suite
└── package.json              # npm package configuration
```

### Performance Features

#### 🚀 Caching
- **In-memory LRU cache** with configurable TTL
- **Automatic cache invalidation** on data changes
- **Cache hit rate monitoring** and statistics

#### ⚡ Rate Limiting
- **Sliding window rate limiting** for API protection
- **Configurable limits** per operation type
- **Rate limit monitoring** and reporting

#### 📊 Metrics & Monitoring
- **Performance metrics** collection and reporting
- **Request/response timing** with percentiles
- **Error rate tracking** and alerting
- **Cache performance** monitoring

#### 🔄 Retry Logic
- **Exponential backoff** for transient failures
- **Configurable retry attempts** and delays
- **Smart retry conditions** (5xx errors, timeouts)

## 🧪 Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone <repository-url>
cd linklibrary-mcp
npm install
```

### Development Commands

```bash
# Build the package
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Format code
npm run format
```

### Testing

The project includes comprehensive tests:

- **Unit tests** for all services and utilities
- **Integration tests** for API interactions
- **Mock testing** for external dependencies
- **Performance tests** for caching and rate limiting

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="Authentication"
npm test -- --testNamePattern="Cache"
```

### Building for Production

```bash
# Build the package
npm run build

# Test the built package
npm start

# Publish to npm
npm publish
```

## 📊 Performance

### Benchmarks

- **Response Time**: < 100ms for cached requests
- **Throughput**: 1000+ requests per minute
- **Memory Usage**: < 50MB for typical usage
- **Cache Hit Rate**: > 80% for read operations

### Monitoring

Enable metrics collection by setting `ENABLE_METRICS=true`:

```bash
export ENABLE_METRICS=true
npx @msmygit/linklibrary-mcp
```

Metrics include:
- Request count and response times
- Cache hit/miss rates
- Rate limit usage
- Error rates and types

## 🔒 Security

### Security Features

- **No local storage** - credentials not stored locally
- **Environment variables** - secure credential management
- **API authentication** - uses LinkLibrary.ai's secure API
- **Rate limiting** - protection against abuse
- **Input validation** - comprehensive parameter validation
- **Error sanitization** - no sensitive data in error messages

### Best Practices

- Use environment variables for credentials
- Enable metrics only in development
- Monitor rate limit usage
- Regularly update dependencies
- Use HTTPS for all API communications

## 🐛 Troubleshooting

### Common Issues

#### Authentication Errors
```bash
# Check environment variables
echo $LL_USERNAME
echo $LL_PASSWORD

# Verify API connectivity
curl -I https://linklibrary.ai/api/health
```

#### Performance Issues
```bash
# Check cache statistics
# Enable debug logging
export LOG_LEVEL=debug

# Monitor rate limits
# Check rate limit configuration
```

#### Connection Issues
```bash
# Test API connectivity
curl https://linklibrary.ai/api/health

# Check network configuration
ping linklibrary.ai
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export LOG_LEVEL=debug
export ENABLE_METRICS=true
npx @msmygit/linklibrary-mcp
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass before submitting

## 📞 Support

- **Documentation**: [LinkLibrary.ai](https://linklibrary.ai)
- **Issues**: [GitHub Issues](https://github.com/msmygit/linklibrary-mcp/issues)
- **Email**: linklibrary.ai@gmail.com

## 🔗 Links

- [LinkLibrary.ai](https://linklibrary.ai) - Main service
- [MCP Documentation](https://modelcontextprotocol.io/) - Protocol specification
- [npm Package](https://www.npmjs.com/package/@msmygit/linklibrary-mcp) - Package page
- [GitHub Repository](https://github.com/msmygit/linklibrary-mcp) - Source code

---

**Built with ❤️ for the AI community** 