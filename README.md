# LinkLibrary MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with programmatic access to LinkLibrary's comprehensive bookmark management capabilities.

## 🚀 Overview

The LinkLibrary MCP Server enables AI assistants to intelligently manage, organize, and analyze bookmarks through a powerful set of tools. It provides seamless integration with the LinkLibrary backend, offering features like:

- **Smart Bookmark Management**: Create, update, and organize bookmarks with AI-powered metadata extraction
- **Advanced Search**: Multi-filter search with relevance scoring and suggestions
- **Collection Organization**: Create and manage themed collections for better organization
- **Tag System**: Flexible tagging with colors and categories
- **Analytics & Insights**: User behavior tracking and bookmark analytics
- **AI-Powered Features**: Intelligent link parsing, content analysis, and recommendations

## ✨ Key Features

### 🔗 Link Management
- Create bookmarks with automatic metadata extraction
- Update and organize existing bookmarks
- AI-powered link parsing from text
- Bulk operations for efficient management

### 📁 Collections & Tags
- Create themed collections for organization
- Flexible tagging system with colors
- Hierarchical organization capabilities
- Smart suggestions for tags and collections

### 🔍 Advanced Search
- Multi-filter search with AND/OR operators
- Date range filtering
- Collection and tag-based filtering
- Search suggestions and autocomplete

### 📊 Analytics & Insights
- User behavior tracking
- Bookmark usage analytics
- Collection and tag statistics
- Performance insights and recommendations

### 🤖 AI Integration
- Intelligent content analysis
- Automatic categorization
- Smart tag suggestions
- Related content recommendations

## 🏗️ Architecture

The MCP server is built with a modular, scalable architecture following best practices:

```
linklibrary-mcp/
├── src/                    # Source code
│   ├── config/            # Configuration management
│   ├── core/              # Core utilities and middleware
│   ├── models/            # Data models and schemas
│   ├── services/          # Business logic services
│   ├── mcp/               # MCP protocol implementation
│   │   ├── tools/         # MCP tool definitions
│   │   └── resources/     # MCP resource definitions
│   └── utils/             # Utility functions
├── tests/                 # Test suite
├── docs/                  # Documentation
├── scripts/               # Deployment and utility scripts
└── requirements.txt       # Python dependencies
```

### Core Components

- **Authentication Service**: Secure JWT-based authentication
- **Link Service**: Comprehensive bookmark management
- **Collection Service**: Collection organization and management
- **Tag Service**: Tag system with colors and categories
- **Search Service**: Advanced search and filtering
- **Analytics Service**: User insights and statistics
- **Cache Manager**: Redis-based caching for performance
- **Rate Limiter**: Protection against abuse

## 🛠️ Installation

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 15 or higher
- LinkLibrary Backend API access

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd linklibrary-mcp
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Setup database**
   ```bash
   # Create PostgreSQL database and user
   sudo -u postgres psql
   CREATE DATABASE linklibrary_mcp;
   CREATE USER linklibrary_mcp_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE linklibrary_mcp TO linklibrary_mcp_user;
   \q
   ```

6. **No additional services required**
   ```bash
   # In-memory caching is used, no external cache service needed
   ```

7. **Run the server**
   ```bash
   python -m src.main
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f linklibrary-mcp
```

## 📖 Usage

### Basic Usage

The MCP server provides a comprehensive set of tools for AI assistants:

#### Authentication
```python
# Authenticate with LinkLibrary credentials
auth_result = await mcp_client.authenticate("username", "password")
```

#### Create a Bookmark
```python
# Create a new bookmark with metadata
result = await mcp_client.call_tool("links_create", {
    "url": "https://example.com/article",
    "title": "Example Article",
    "summary": "A great article about AI",
    "collection_id": 1,
    "tag_ids": [1, 2],
    "is_favorite": True
})
```

#### Search Bookmarks
```python
# Advanced search with filters
results = await mcp_client.call_tool("search_advanced", {
    "query": "machine learning",
    "operator": "AND",
    "collection_ids": [1, 2],
    "tag_ids": [1, 3],
    "limit": 20
})
```

#### Parse Links from Text
```python
# Extract and analyze links from text
parsed_links = await mcp_client.call_tool("links_parse", {
    "text": "Check out these resources: https://example.com/article1 and https://example.com/article2"
})
```

### Available Tools

#### Link Management
- `links_get` - Retrieve links with filtering and pagination
- `links_create` - Create new bookmarks with metadata
- `links_update` - Update existing bookmarks
- `links_delete` - Delete bookmarks
- `links_parse` - Parse links from text with AI analysis

#### Collections
- `collections_get` - Retrieve user collections
- `collections_create` - Create new collections
- `collections_update` - Update collections
- `collections_delete` - Delete collections

#### Tags
- `tags_get` - Retrieve user tags
- `tags_create` - Create new tags
- `tags_update` - Update tags
- `tags_delete` - Delete tags

#### Search
- `search_advanced` - Advanced search with multiple filters
- `search_suggestions` - Get search suggestions

#### Analytics
- `analytics_user_stats` - User statistics and insights
- `analytics_link_insights` - Link-specific analytics

## 🔧 Configuration

### Environment Variables

```env
# MCP Server Configuration
MCP_SERVER_NAME=linklibrary-mcp
MCP_SERVER_VERSION=1.0.0

# LinkLibrary API Configuration
LINKLIBRARY_API_URL=http://localhost:8000
LINKLIBRARY_API_KEY=your_api_key_here

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/linklibrary_mcp

# In-Memory Cache
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s
```

### Security Configuration

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Configurable rate limits to prevent abuse
- **Input Validation**: Comprehensive validation for all inputs
- **CORS Configuration**: Configurable cross-origin resource sharing
- **SSL/TLS**: Support for secure communications

## 🧪 Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test categories
pytest tests/test_services/
pytest tests/test_mcp/
pytest tests/test_integration/
```

### Test Structure

```
tests/
├── conftest.py           # Test configuration and fixtures
├── test_services/        # Service layer tests
├── test_mcp/            # MCP protocol tests
└── test_integration/    # Integration tests
```

## 📊 Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:8000/health

# Detailed health check
curl http://localhost:8000/health/detailed
```

### Metrics

The server exposes Prometheus metrics at `/metrics`:

```bash
curl http://localhost:8000/metrics
```

### Logging

Structured logging with rotation:

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## 🚀 Deployment

### Production Deployment

See [Deployment Guide](docs/deployment.md) for detailed instructions on:

- Docker deployment
- Kubernetes deployment
- Production server setup
- SSL/TLS configuration
- Load balancing
- Monitoring and alerting

### Performance Optimization

- **Connection Pooling**: Efficient database connections
- **Caching**: In-memory caching for frequently accessed data
- **Async Operations**: Non-blocking I/O for all operations
- **Batch Processing**: Efficient bulk operations
- **Pagination**: Optimized data retrieval

## 🔒 Security

### Security Features

- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Protection against abuse
- **Audit Logging**: Track all operations for security monitoring
- **HTTPS/TLS**: Secure communications

### Security Best Practices

- Use strong, unique passwords
- Keep dependencies updated
- Monitor logs for suspicious activity
- Regular security audits
- Implement proper access controls

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- Follow PEP 8 for Python code
- Use type hints
- Write comprehensive docstrings
- Add tests for new features
- Update documentation as needed

## 📚 Documentation

- [Architecture Guide](docs/architecture.md) - Detailed architecture documentation
- [API Documentation](docs/api.md) - Complete API reference
- [Deployment Guide](docs/deployment.md) - Deployment instructions
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

## 🐛 Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check if services are running
sudo systemctl status linklibrary-mcp
sudo systemctl status postgresql
sudo systemctl status redis-server
```

#### Authentication Issues
- Verify API credentials in `.env`
- Check JWT secret key configuration
- Ensure LinkLibrary backend is accessible

#### Performance Issues
- Monitor database connection pool
- Check in-memory cache performance
- Review rate limiting configuration

### Getting Help

- **Documentation**: Check the docs directory
- **Issues**: Report bugs on GitHub
- **Discussions**: Join community discussions
- **Email**: Contact support@linklibrary.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- LinkLibrary team for the backend API
- MCP community for the protocol specification
- Contributors and maintainers

## 📞 Support

For support and questions:

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/linklibrary/linklibrary-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/linklibrary/linklibrary-mcp/discussions)
- **Email**: support@linklibrary.com

---

**Made with ❤️ by the LinkLibrary Team** 