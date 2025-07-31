# LinkLibrary MCP Server Architecture

## Overview

This document outlines the comprehensive architecture for building a Model Context Protocol (MCP) server for the LinkLibrary project. The MCP server will provide AI assistants with programmatic access to LinkLibrary's bookmark management capabilities, enabling intelligent bookmark organization, search, and content analysis.

## Project Analysis

### Backend Capabilities (FastAPI + Supabase [a PostgreSQL compliant database])
- **User Management**: Authentication, registration, profile management
- **Bookmark Management**: CRUD operations, metadata extraction, content analysis
- **Collections**: Organize bookmarks into themed collections
- **Tags**: Flexible tagging system with colors and categories
- **Search**: Advanced search with filters, operators, and sorting
- **Import/Export**: Browser bookmark import, bulk operations
- **AI Integration**: LLM-powered content analysis and summarization
- **Analytics**: User behavior tracking and insights
- **Subscription Management**: Billing and premium features

### Frontend Capabilities (Next.js + TypeScript)
- **Modern UI**: React-based interface with Tailwind CSS
- **Real-time Updates**: Optimistic updates and state management
- **Advanced Search**: Multi-filter search interface
- **Collection Management**: Visual collection organization
- **Tag System**: Interactive tagging interface
- **Import Tools**: Browser extension integration
- **Responsive Design**: Mobile and desktop optimized

## MCP Server Architecture

### 1. Core Architecture Principles

#### DRY (Don't Repeat Yourself)
- **Shared Utilities**: Common validation, error handling, and data transformation
- **Base Classes**: Abstract base classes for common MCP operations
- **Configuration Management**: Centralized configuration with environment-specific overrides
- **Middleware Pattern**: Reusable authentication and rate limiting

#### Security Best Practices
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent abuse with configurable rate limits
- **Input Validation**: Comprehensive validation for all inputs
- **Error Handling**: Secure error responses without information leakage
- **Audit Logging**: Track all operations for security monitoring

#### High-Performance Design
- **Connection Pooling**: Efficient database connection management
- **In-Memory Caching**: Application-level caching for frequently accessed data
- **Async Operations**: Non-blocking I/O for all operations
- **Batch Processing**: Efficient bulk operations
- **Pagination**: Optimized data retrieval with cursors

### 2. Project Structure

```
linklibrary-mcp/
├── src/
│   ├── __init__.py
│   ├── main.py                 # MCP server entry point
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py         # Configuration management
│   │   └── logging.py          # Logging configuration
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth.py             # Authentication middleware
│   │   ├── cache.py            # Caching utilities
│   │   ├── database.py         # Database connection management
│   │   ├── errors.py           # Error handling and custom exceptions
│   │   └── validators.py       # Input validation utilities
│   ├── models/
│   │   ├── __init__.py
│   │   ├── link.py             # Link data models
│   │   ├── collection.py       # Collection data models
│   │   ├── tag.py              # Tag data models
│   │   └── user.py             # User data models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py     # Authentication service
│   │   ├── link_service.py     # Link management service
│   │   ├── collection_service.py # Collection management service
│   │   ├── tag_service.py      # Tag management service
│   │   ├── search_service.py   # Search and filtering service
│   │   ├── import_service.py   # Import/export service
│   │   └── analytics_service.py # Analytics and insights service
│   ├── mcp/
│   │   ├── __init__.py
│   │   ├── server.py           # MCP server implementation
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── links.py        # Link-related MCP tools
│   │   │   ├── collections.py  # Collection-related MCP tools
│   │   │   ├── tags.py         # Tag-related MCP tools
│   │   │   ├── search.py       # Search-related MCP tools
│   │   │   └── analytics.py    # Analytics-related MCP tools
│   │   └── resources/
│   │       ├── __init__.py
│   │       ├── links.py        # Link resource definitions
│   │       ├── collections.py  # Collection resource definitions
│   │       └── tags.py         # Tag resource definitions
│   └── utils/
│       ├── __init__.py
│       ├── http_client.py      # HTTP client utilities
│       ├── metadata.py         # URL metadata extraction
│       └── transformers.py     # Data transformation utilities
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # Test configuration
│   ├── test_services/          # Service layer tests
│   ├── test_mcp/               # MCP layer tests
│   └── test_integration/       # Integration tests
├── docs/
│   ├── architecture.md         # This document
│   ├── api.md                  # MCP API documentation
│   └── deployment.md           # Deployment guide
├── scripts/
│   ├── setup.py                # Development setup
│   └── deploy.py               # Deployment script
├── requirements.txt            # Python dependencies
├── pyproject.toml              # Project configuration
├── Dockerfile                  # Container configuration
├── docker-compose.yml          # Development environment
└── README.md                   # Project documentation
```

### 3. Core Components

#### 3.1 Configuration Management (`config/settings.py`)

```python
from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # MCP Server Configuration
    mcp_server_name: str = "linklibrary-mcp"
    mcp_server_version: str = "1.0.0"
    
    # LinkLibrary API Configuration
    linklibrary_api_url: str
    linklibrary_api_key: str
    
    # Authentication
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Database
    database_url: str
    
    # In-Memory Cache
    cache_ttl: int = 3600  # 1 hour
    cache_max_size: int = 1000  # Maximum number of cached items
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 3600  # 1 hour
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Security
    cors_origins: List[str] = ["*"]
    allowed_hosts: List[str] = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

#### 3.2 Database Connection (`core/database.py`)

```python
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from contextlib import asynccontextmanager

from ..config.settings import settings

Base = declarative_base()

class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.session_factory = None
    
    async def initialize(self):
        """Initialize database connection and session factory."""
        self.engine = create_async_engine(
            settings.database_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        
        self.session_factory = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Initialize cache manager
        from ..core.cache import cache_manager
        # Cache is already initialized as a global instance
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session with automatic cleanup."""
        if not self.session_factory:
            raise RuntimeError("Database not initialized")
        
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def close(self):
        """Close database connections."""
        if self.engine:
            await self.engine.dispose()

db_manager = DatabaseManager()
```

#### 3.3 Authentication Service (`services/auth_service.py`)

```python
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
import httpx

from ..config.settings import settings
from ..core.errors import AuthenticationError

class AuthService:
    def __init__(self):
        self.api_url = settings.linklibrary_api_url
        self.api_key = settings.linklibrary_api_key
    
    async def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user with LinkLibrary API."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/api/v1/auth/login",
                json={"username": username, "password": password},
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            
            if response.status_code != 200:
                raise AuthenticationError("Invalid credentials")
            
            return response.json()
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        
        return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token and return payload."""
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.JWTError:
            raise AuthenticationError("Invalid token")
    
    async def get_current_user(self, token: str) -> Dict[str, Any]:
        """Get current user from token."""
        payload = self.verify_token(token)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        
        # Fetch user details from LinkLibrary API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/api/v1/users/me",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-API-Key": self.api_key
                }
            )
            
            if response.status_code != 200:
                raise AuthenticationError("Failed to fetch user details")
            
            return response.json()

auth_service = AuthService()
```

#### 3.4 Link Service (`services/link_service.py`)

```python
from typing import List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status

from ..config.settings import settings
from ..core.errors import ServiceError
from ..utils.metadata import extract_url_metadata

class LinkService:
    def __init__(self):
        self.api_url = settings.linklibrary_api_url
        self.api_key = settings.linklibrary_api_key
    
    async def get_links(
        self,
        token: str,
        limit: int = 50,
        skip: int = 0,
        collection_id: Optional[int] = None,
        tag_ids: Optional[List[int]] = None,
        search: Optional[str] = None,
        is_favorite: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_desc: bool = True
    ) -> Dict[str, Any]:
        """Get links with filtering and pagination."""
        params = {
            "limit": limit,
            "skip": skip,
            "sort_by": sort_by,
            "sort_desc": sort_desc
        }
        
        if collection_id:
            params["collection_id"] = collection_id
        if tag_ids:
            params["tag_ids"] = tag_ids
        if search:
            params["search"] = search
        if is_favorite is not None:
            params["is_favorite"] = is_favorite
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/api/v1/links",
                params=params,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-API-Key": self.api_key
                }
            )
            
            if response.status_code != 200:
                raise ServiceError(f"Failed to fetch links: {response.text}")
            
            return response.json()
    
    async def create_link(
        self,
        token: str,
        url: str,
        title: str,
        summary: Optional[str] = None,
        notes: Optional[str] = None,
        collection_id: Optional[int] = None,
        tag_ids: Optional[List[int]] = None,
        is_favorite: bool = False
    ) -> Dict[str, Any]:
        """Create a new link with metadata extraction."""
        # Extract metadata if not provided
        if not summary:
            metadata = await extract_url_metadata(url)
            summary = metadata.get("description", "")
        
        link_data = {
            "url": url,
            "title": title,
            "summary": summary,
            "notes": notes or "",
            "collection_id": collection_id,
            "tag_ids": tag_ids or [],
            "is_favorite": is_favorite,
            "input_source": "mcp"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/api/v1/links",
                json=link_data,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-API-Key": self.api_key
                }
            )
            
            if response.status_code != 201:
                raise ServiceError(f"Failed to create link: {response.text}")
            
            return response.json()
    
    async def update_link(
        self,
        token: str,
        link_id: str,
        **updates
    ) -> Dict[str, Any]:
        """Update an existing link."""
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.api_url}/api/v1/links/{link_id}",
                json=updates,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-API-Key": self.api_key
                }
            )
            
            if response.status_code != 200:
                raise ServiceError(f"Failed to update link: {response.text}")
            
            return response.json()
    
    async def delete_link(self, token: str, link_id: str) -> None:
        """Delete a link."""
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.api_url}/api/v1/links/{link_id}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-API-Key": self.api_key
                }
            )
            
            if response.status_code != 204:
                raise ServiceError(f"Failed to delete link: {response.text}")
    
    async def parse_links_from_text(
        self,
        token: str,
        text: str
    ) -> List[Dict[str, Any]]:
        """Parse text and extract links with AI-powered analysis."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/api/v1/links/parse",
                json={"text": text},
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-API-Key": self.api_key
                }
            )
            
            if response.status_code != 200:
                raise ServiceError(f"Failed to parse links: {response.text}")
            
            return response.json()

link_service = LinkService()
```

#### 3.5 MCP Server Implementation (`mcp/server.py`)

```python
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource
)

from ..config.settings import settings
from ..services.auth_service import auth_service
from ..services.link_service import link_service
from ..services.collection_service import collection_service
from ..services.tag_service import tag_service
from ..services.search_service import search_service
from .tools.links import LinkTools
from .tools.collections import CollectionTools
from .tools.tags import TagTools
from .tools.search import SearchTools

logger = logging.getLogger(__name__)

class LinkLibraryMCPServer:
    def __init__(self):
        self.server = Server(settings.mcp_server_name)
        self.current_user: Optional[Dict[str, Any]] = None
        self.current_token: Optional[str] = None
        
        # Initialize tool handlers
        self.link_tools = LinkTools()
        self.collection_tools = CollectionTools()
        self.tag_tools = TagTools()
        self.search_tools = SearchTools()
        
        # Register MCP handlers
        self._register_handlers()
    
    def _register_handlers(self):
        """Register all MCP protocol handlers."""
        
        @self.server.list_tools()
        async def handle_list_tools() -> ListToolsResult:
            """List all available tools."""
            tools = []
            
            # Add link tools
            tools.extend(self.link_tools.get_tools())
            
            # Add collection tools
            tools.extend(self.collection_tools.get_tools())
            
            # Add tag tools
            tools.extend(self.tag_tools.get_tools())
            
            # Add search tools
            tools.extend(self.search_tools.get_tools())
            
            return ListToolsResult(tools=tools)
        
        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
            """Handle tool calls with authentication."""
            try:
                # Check authentication
                if not self.current_token:
                    raise Exception("Authentication required. Please authenticate first.")
                
                # Route to appropriate tool handler
                if name.startswith("links_"):
                    result = await self.link_tools.handle_tool(name, arguments, self.current_token)
                elif name.startswith("collections_"):
                    result = await self.collection_tools.handle_tool(name, arguments, self.current_token)
                elif name.startswith("tags_"):
                    result = await self.tag_tools.handle_tool(name, arguments, self.current_token)
                elif name.startswith("search_"):
                    result = await self.search_tools.handle_tool(name, arguments, self.current_token)
                else:
                    raise Exception(f"Unknown tool: {name}")
                
                return CallToolResult(
                    content=[TextContent(type="text", text=json.dumps(result, indent=2))]
                )
                
            except Exception as e:
                logger.error(f"Tool call failed: {e}")
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Error: {str(e)}")]
                )
        
        @self.server.list_resources()
        async def handle_list_resources() -> List[EmbeddedResource]:
            """List available resources."""
            # This can be used to provide static resources like documentation
            return []
    
    async def authenticate(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user and store credentials."""
        try:
            auth_result = await auth_service.authenticate_user(username, password)
            self.current_token = auth_result["access_token"]
            self.current_user = await auth_service.get_current_user(self.current_token)
            
            return {
                "success": True,
                "user": self.current_user,
                "message": "Authentication successful"
            }
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def run(self):
        """Run the MCP server."""
        # Start cache cleanup task
        from ..core.cache import cleanup_cache_task
        asyncio.create_task(cleanup_cache_task())
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name=settings.mcp_server_name,
                    server_version=settings.mcp_server_version,
                    capabilities=self.server.get_capabilities(
                        notification_options=None,
                        experimental_capabilities={}
                    )
                )
            )

# Global server instance
mcp_server = LinkLibraryMCPServer()
```

### 4. MCP Tools Implementation

#### 4.1 Link Tools (`mcp/tools/links.py`)

```python
from typing import Dict, Any, List, Optional
from mcp.types import Tool

from ...services.link_service import link_service

class LinkTools:
    def get_tools(self) -> List[Tool]:
        """Get all link-related tools."""
        return [
            Tool(
                name="links_get",
                description="Get links with optional filtering and pagination",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "default": 50},
                        "skip": {"type": "integer", "default": 0},
                        "collection_id": {"type": "integer"},
                        "tag_ids": {"type": "array", "items": {"type": "integer"}},
                        "search": {"type": "string"},
                        "is_favorite": {"type": "boolean"},
                        "sort_by": {"type": "string", "default": "created_at"},
                        "sort_desc": {"type": "boolean", "default": True}
                    }
                }
            ),
            Tool(
                name="links_create",
                description="Create a new link with optional metadata",
                inputSchema={
                    "type": "object",
                    "required": ["url", "title"],
                    "properties": {
                        "url": {"type": "string"},
                        "title": {"type": "string"},
                        "summary": {"type": "string"},
                        "notes": {"type": "string"},
                        "collection_id": {"type": "integer"},
                        "tag_ids": {"type": "array", "items": {"type": "integer"}},
                        "is_favorite": {"type": "boolean", "default": False}
                    }
                }
            ),
            Tool(
                name="links_update",
                description="Update an existing link",
                inputSchema={
                    "type": "object",
                    "required": ["link_id"],
                    "properties": {
                        "link_id": {"type": "string"},
                        "title": {"type": "string"},
                        "summary": {"type": "string"},
                        "notes": {"type": "string"},
                        "collection_id": {"type": "integer"},
                        "tag_ids": {"type": "array", "items": {"type": "integer"}},
                        "is_favorite": {"type": "boolean"}
                    }
                }
            ),
            Tool(
                name="links_delete",
                description="Delete a link",
                inputSchema={
                    "type": "object",
                    "required": ["link_id"],
                    "properties": {
                        "link_id": {"type": "string"}
                    }
                }
            ),
            Tool(
                name="links_parse",
                description="Parse text and extract links with AI analysis",
                inputSchema={
                    "type": "object",
                    "required": ["text"],
                    "properties": {
                        "text": {"type": "string"}
                    }
                }
            )
        ]
    
    async def handle_tool(self, name: str, arguments: Dict[str, Any], token: str) -> Dict[str, Any]:
        """Handle link tool calls."""
        if name == "links_get":
            return await link_service.get_links(token, **arguments)
        elif name == "links_create":
            return await link_service.create_link(token, **arguments)
        elif name == "links_update":
            link_id = arguments.pop("link_id")
            return await link_service.update_link(token, link_id, **arguments)
        elif name == "links_delete":
            return await link_service.delete_link(token, arguments["link_id"])
        elif name == "links_parse":
            return await link_service.parse_links_from_text(token, arguments["text"])
        else:
            raise ValueError(f"Unknown link tool: {name}")
```

### 5. Error Handling and Validation

#### 5.1 Custom Exceptions (`core/errors.py`)

```python
class LinkLibraryError(Exception):
    """Base exception for LinkLibrary MCP server."""
    pass

class AuthenticationError(LinkLibraryError):
    """Authentication-related errors."""
    pass

class ValidationError(LinkLibraryError):
    """Input validation errors."""
    pass

class ServiceError(LinkLibraryError):
    """Service layer errors."""
    pass

class RateLimitError(LinkLibraryError):
    """Rate limiting errors."""
    pass
```

#### 5.2 Input Validation (`core/validators.py`)

```python
from typing import Any, Dict, List
from pydantic import BaseModel, validator, HttpUrl
import re

class LinkCreateValidator(BaseModel):
    url: HttpUrl
    title: str
    summary: str = ""
    notes: str = ""
    collection_id: int = None
    tag_ids: List[int] = []
    is_favorite: bool = False
    
    @validator('title')
    def validate_title(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Title cannot be empty")
        if len(v) > 500:
            raise ValueError("Title too long (max 500 characters)")
        return v.strip()
    
    @validator('summary')
    def validate_summary(cls, v):
        if len(v) > 2000:
            raise ValueError("Summary too long (max 2000 characters)")
        return v
    
    @validator('notes')
    def validate_notes(cls, v):
        if len(v) > 10000:
            raise ValueError("Notes too long (max 10000 characters)")
        return v

class SearchValidator(BaseModel):
    query: str
    limit: int = 50
    skip: int = 0
    collection_ids: List[int] = []
    tag_ids: List[int] = []
    operator: str = "OR"
    
    @validator('query')
    def validate_query(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Search query cannot be empty")
        return v.strip()
    
    @validator('operator')
    def validate_operator(cls, v):
        if v not in ["AND", "OR"]:
            raise ValueError("Operator must be 'AND' or 'OR'")
        return v
    
    @validator('limit')
    def validate_limit(cls, v):
        if v < 1 or v > 100:
            raise ValueError("Limit must be between 1 and 100")
        return v
```

### 6. Caching and Performance

#### 6.1 In-Memory Cache Implementation (`core/cache.py`)

```python
import json
import time
import asyncio
from typing import Any, Optional, Dict, Tuple
from collections import OrderedDict
from functools import wraps

from ..config.settings import settings

class InMemoryCache:
    """Thread-safe in-memory cache with LRU eviction."""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._cache: OrderedDict = OrderedDict()
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        async with self._lock:
            if key in self._cache:
                value, expiry = self._cache[key]
                if expiry > time.time():
                    # Move to end (most recently used)
                    self._cache.move_to_end(key)
                    return value
                else:
                    # Expired, remove it
                    del self._cache[key]
            return None
    
    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache with TTL."""
        async with self._lock:
            ttl = ttl or settings.cache_ttl
            expiry = time.time() + ttl
            
            # Remove if already exists
            if key in self._cache:
                del self._cache[key]
            
            # Add new item
            self._cache[key] = (value, expiry)
            
            # Evict oldest if cache is full
            if len(self._cache) > self.max_size:
                self._cache.popitem(last=False)
            
            return True
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    async def clear(self) -> bool:
        """Clear all cached items."""
        async with self._lock:
            self._cache.clear()
            return True
    
    async def clear_pattern(self, pattern: str) -> bool:
        """Clear all keys matching pattern."""
        async with self._lock:
            keys_to_remove = [key for key in self._cache.keys() if pattern in key]
            for key in keys_to_remove:
                del self._cache[key]
            return True
    
    async def cleanup_expired(self) -> int:
        """Remove expired items and return count of removed items."""
        async with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, (_, expiry) in self._cache.items()
                if expiry <= current_time
            ]
            for key in expired_keys:
                del self._cache[key]
            return len(expired_keys)

# Global cache instance
cache_manager = InMemoryCache(settings.cache_max_size)

def cache_result(ttl: int = None, key_prefix: str = ""):
    """Decorator to cache function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            await cache_manager.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

# Background task to cleanup expired items
async def cleanup_cache_task():
    """Background task to periodically cleanup expired cache items."""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            removed_count = await cache_manager.cleanup_expired()
            if removed_count > 0:
                print(f"Cleaned up {removed_count} expired cache items")
        except Exception as e:
            print(f"Cache cleanup error: {e}")
```

### 7. Security Implementation

#### 7.1 Rate Limiting (`core/rate_limiter.py`)

```python
import time
import asyncio
from typing import Dict, Tuple
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)
    
    async def is_allowed(self, identifier: str) -> Tuple[bool, int]:
        """Check if request is allowed and return remaining requests."""
        now = time.time()
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window_seconds
        ]
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= self.max_requests:
            return False, 0
        
        # Add current request
        self.requests[identifier].append(now)
        
        # Return remaining requests
        remaining = self.max_requests - len(self.requests[identifier])
        return True, remaining
    
    def get_reset_time(self, identifier: str) -> float:
        """Get time when rate limit resets."""
        if not self.requests[identifier]:
            return time.time()
        
        oldest_request = min(self.requests[identifier])
        return oldest_request + self.window_seconds

# Global rate limiter
rate_limiter = RateLimiter(
    max_requests=100,
    window_seconds=3600
)
```

### 8. Testing Strategy

#### 8.1 Test Structure

```python
# tests/test_services/test_link_service.py
import pytest
import httpx
from unittest.mock import AsyncMock, patch
from ...services.link_service import LinkService

class TestLinkService:
    @pytest.fixture
    def link_service(self):
        return LinkService()
    
    @pytest.mark.asyncio
    async def test_get_links_success(self, link_service):
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "items": [],
                "total": 0,
                "skip": 0,
                "limit": 50
            }
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await link_service.get_links("test_token")
            
            assert result["total"] == 0
            assert "items" in result
    
    @pytest.mark.asyncio
    async def test_get_links_error(self, link_service):
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 401
            mock_response.text = "Unauthorized"
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            with pytest.raises(Exception):
                await link_service.get_links("invalid_token")
```

### 9. Deployment Configuration

#### 9.1 Docker Configuration (`Dockerfile`)

```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run the application
CMD ["python", "-m", "src.main"]
```

#### 9.2 Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  linklibrary-mcp:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/linklibrary
      - REDIS_URL=redis://redis:6379
      - LINKLIBRARY_API_URL=http://linklibrary-backend:8000
      - LINKLIBRARY_API_KEY=${LINKLIBRARY_API_KEY}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=linklibrary
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 10. Monitoring and Logging

#### 10.1 Logging Configuration (`config/logging.py`)

```python
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

from .settings import settings

def setup_logging():
    """Setup comprehensive logging configuration."""
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format=settings.log_format,
        handlers=[
            # Console handler
            logging.StreamHandler(sys.stdout),
            # File handler with rotation
            RotatingFileHandler(
                log_dir / "linklibrary-mcp.log",
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            ),
            # Error file handler
            RotatingFileHandler(
                log_dir / "linklibrary-mcp-error.log",
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5,
                level=logging.ERROR
            )
        ]
    )
    
    # Set specific logger levels
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    
    # Create logger for this application
    logger = logging.getLogger("linklibrary-mcp")
    logger.info("Logging configured successfully")
    
    return logger
```

### 11. Performance Optimization

#### 11.1 Connection Pooling

```python
# Enhanced database connection with connection pooling
import asyncio
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import QueuePool

class OptimizedDatabaseManager:
    def __init__(self):
        self.engine = None
        self._pool = None
    
    async def initialize(self):
        """Initialize with optimized connection pooling."""
        self.engine = create_async_engine(
            settings.database_url,
            echo=False,
            poolclass=QueuePool,
            pool_size=20,
            max_overflow=30,
            pool_pre_ping=True,
            pool_recycle=3600,
            pool_timeout=30
        )
        
        # Test connection
        async with self.engine.begin() as conn:
            await conn.execute("SELECT 1")
    
    @asynccontextmanager
    async def get_session(self):
        """Get database session with connection pooling."""
        async with self.engine.begin() as conn:
            async with AsyncSession(conn) as session:
                try:
                    yield session
                except Exception:
                    await session.rollback()
                    raise
```

#### 11.2 Batch Processing

```python
class BatchProcessor:
    """Handle batch operations efficiently."""
    
    @staticmethod
    async def batch_create_links(links_data: List[Dict[str, Any]], token: str) -> List[Dict[str, Any]]:
        """Create multiple links in batches."""
        batch_size = 10
        results = []
        
        for i in range(0, len(links_data), batch_size):
            batch = links_data[i:i + batch_size]
            
            # Process batch concurrently
            tasks = [
                link_service.create_link(token, **link_data)
                for link_data in batch
            ]
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            results.extend(batch_results)
            
            # Small delay between batches to avoid overwhelming the API
            if i + batch_size < len(links_data):
                await asyncio.sleep(0.1)
        
        return results
```

### 12. Security Best Practices

#### 12.1 Input Sanitization

```python
import html
import re
from urllib.parse import urlparse

class SecurityUtils:
    @staticmethod
    def sanitize_text(text: str) -> str:
        """Sanitize user input text."""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Escape HTML entities
        text = html.escape(text)
        # Remove control characters
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        return text.strip()
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format and security."""
        try:
            parsed = urlparse(url)
            # Check for valid scheme
            if parsed.scheme not in ['http', 'https']:
                return False
            # Check for valid domain
            if not parsed.netloc:
                return False
            # Check for suspicious patterns
            suspicious_patterns = [
                r'javascript:',
                r'data:',
                r'file:',
                r'vbscript:'
            ]
            for pattern in suspicious_patterns:
                if re.search(pattern, url, re.IGNORECASE):
                    return False
            return True
        except Exception:
            return False
```

### 13. API Documentation

The MCP server will provide comprehensive API documentation through:

1. **OpenAPI/Swagger**: Auto-generated API documentation
2. **Tool Descriptions**: Detailed descriptions for each MCP tool
3. **Example Usage**: Code examples for common use cases
4. **Error Codes**: Comprehensive error code documentation

### 14. Development Workflow

#### 14.1 Development Setup Script (`scripts/setup.py`)

```python
#!/usr/bin/env python3
"""Development environment setup script."""

import subprocess
import sys
from pathlib import Path

def run_command(command: str, description: str):
    """Run a command with error handling."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        sys.exit(1)

def main():
    """Main setup function."""
    print("🚀 Setting up LinkLibrary MCP Server development environment...")
    
    # Check Python version
    if sys.version_info < (3, 11):
        print("❌ Python 3.11 or higher is required")
        sys.exit(1)
    
    # Create virtual environment
    run_command("python -m venv venv", "Creating virtual environment")
    
    # Install dependencies
    run_command("pip install -r requirements.txt", "Installing Python dependencies")
    
    # Create necessary directories
    Path("logs").mkdir(exist_ok=True)
    Path("data").mkdir(exist_ok=True)
    
    # Copy environment template
    if not Path(".env").exists():
        run_command("cp .env.example .env", "Creating environment file")
        print("⚠️  Please update .env with your configuration")
    
    print("🎉 Development environment setup complete!")
    print("\nNext steps:")
    print("1. Update .env with your configuration")
    print("2. Run 'python -m src.main' to start the server")
    print("3. Run 'pytest' to run tests")

if __name__ == "__main__":
    main()
```

### 15. Conclusion

This architecture provides a robust, scalable, and secure foundation for the LinkLibrary MCP server. Key features include:

- **Modular Design**: Clean separation of concerns with reusable components
- **Security First**: Comprehensive authentication, validation, and rate limiting
- **High Performance**: Connection pooling, caching, and async operations
- **Developer Friendly**: Comprehensive testing, logging, and documentation
- **Production Ready**: Docker deployment, monitoring, and error handling

The implementation follows industry best practices and provides a solid foundation for building a powerful MCP server that can integrate seamlessly with AI assistants to provide intelligent bookmark management capabilities.

## Next Steps for Implementation

1. **Set up the project structure** as outlined above
2. **Implement core services** starting with authentication and link management
3. **Create MCP tools** for each major functionality
4. **Add comprehensive testing** for all components
5. **Set up CI/CD pipeline** for automated testing and deployment
6. **Create documentation** for API usage and integration
7. **Performance testing** and optimization
8. **Security audit** and penetration testing 