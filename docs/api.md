# LinkLibrary MCP Server API Documentation

## Overview

The LinkLibrary MCP Server provides a comprehensive set of tools for AI assistants to interact with the LinkLibrary bookmark management system. This document details all available tools, their parameters, and usage examples.

## Authentication

Before using any tools, the MCP server requires authentication with LinkLibrary credentials.

### Authentication Flow

1. **Initial Setup**: The MCP server needs to be configured with LinkLibrary API credentials
2. **User Authentication**: Users authenticate using their LinkLibrary username/password
3. **Token Management**: The server handles JWT token refresh automatically
4. **Session Persistence**: Authentication state is maintained throughout the session

## Available Tools

### Link Management Tools

#### `links_get`
Retrieve links with optional filtering and pagination.

**Parameters:**
- `limit` (integer, optional): Number of links to return (default: 50, max: 100)
- `skip` (integer, optional): Number of links to skip for pagination (default: 0)
- `collection_id` (integer, optional): Filter by collection ID
- `tag_ids` (array of integers, optional): Filter by tag IDs
- `search` (string, optional): Search query for title, summary, or notes
- `is_favorite` (boolean, optional): Filter by favorite status
- `sort_by` (string, optional): Sort field (default: "created_at")
- `sort_desc` (boolean, optional): Sort in descending order (default: true)

**Example Usage:**
```json
{
  "name": "links_get",
  "arguments": {
    "limit": 20,
    "search": "machine learning",
    "is_favorite": true,
    "sort_by": "updated_at"
  }
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid-string",
      "url": "https://example.com/article",
      "title": "Machine Learning Basics",
      "summary": "Introduction to machine learning concepts",
      "notes": "Great resource for beginners",
      "is_favorite": true,
      "collection_id": 1,
      "tag_ids": [1, 2],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 20,
  "has_more": false
}
```

#### `links_create`
Create a new link with optional metadata extraction.

**Parameters:**
- `url` (string, required): The URL to bookmark
- `title` (string, required): Title for the bookmark
- `summary` (string, optional): Summary/description
- `notes` (string, optional): Additional notes
- `collection_id` (integer, optional): Collection to add to
- `tag_ids` (array of integers, optional): Tags to apply
- `is_favorite` (boolean, optional): Mark as favorite (default: false)

**Example Usage:**
```json
{
  "name": "links_create",
  "arguments": {
    "url": "https://openai.com/blog/chatgpt",
    "title": "ChatGPT: Optimizing Language Models for Dialogue",
    "summary": "OpenAI's research on conversational AI",
    "collection_id": 1,
    "tag_ids": [1, 3],
    "is_favorite": true
  }
}
```

#### `links_update`
Update an existing link's properties.

**Parameters:**
- `link_id` (string, required): ID of the link to update
- `title` (string, optional): New title
- `summary` (string, optional): New summary
- `notes` (string, optional): New notes
- `collection_id` (integer, optional): New collection ID
- `tag_ids` (array of integers, optional): New tag IDs
- `is_favorite` (boolean, optional): New favorite status

**Example Usage:**
```json
{
  "name": "links_update",
  "arguments": {
    "link_id": "uuid-string",
    "title": "Updated Title",
    "notes": "Updated notes with new information",
    "is_favorite": true
  }
}
```

#### `links_delete`
Delete a link permanently.

**Parameters:**
- `link_id` (string, required): ID of the link to delete

**Example Usage:**
```json
{
  "name": "links_delete",
  "arguments": {
    "link_id": "uuid-string"
  }
}
```

#### `links_parse`
Parse text and extract links with AI-powered analysis.

**Parameters:**
- `text` (string, required): Text containing URLs to parse

**Example Usage:**
```json
{
  "name": "links_parse",
  "arguments": {
    "text": "Check out these resources: https://example.com/article1 and https://example.com/article2"
  }
}
```

**Response:**
```json
[
  {
    "link": "https://example.com/article1",
    "desc": "Article Title 1",
    "summary": "AI-generated summary of the article",
    "notes": "AI-generated notes and insights"
  },
  {
    "link": "https://example.com/article2",
    "desc": "Article Title 2",
    "summary": "AI-generated summary of the article",
    "notes": "AI-generated notes and insights"
  }
]
```

### Collection Management Tools

#### `collections_get`
Retrieve user's collections.

**Parameters:**
- `include_default` (boolean, optional): Include default collections (default: true)

**Example Usage:**
```json
{
  "name": "collections_get",
  "arguments": {
    "include_default": true
  }
}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Development",
    "description": "Coding resources and tutorials",
    "icon": "Tech",
    "color": "green",
    "is_default": false,
    "link_count": 15,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `collections_create`
Create a new collection.

**Parameters:**
- `name` (string, required): Collection name
- `description` (string, optional): Collection description
- `icon` (string, optional): Icon identifier
- `color` (string, optional): Color theme

**Example Usage:**
```json
{
  "name": "collections_create",
  "arguments": {
    "name": "AI Research",
    "description": "Latest AI research papers and articles",
    "icon": "AI/ML",
    "color": "purple"
  }
}
```

#### `collections_update`
Update an existing collection.

**Parameters:**
- `collection_id` (integer, required): ID of the collection to update
- `name` (string, optional): New name
- `description` (string, optional): New description
- `icon` (string, optional): New icon
- `color` (string, optional): New color

**Example Usage:**
```json
{
  "name": "collections_update",
  "arguments": {
    "collection_id": 1,
    "name": "Updated Collection Name",
    "description": "Updated description"
  }
}
```

#### `collections_delete`
Delete a collection (links will be moved to default collection).

**Parameters:**
- `collection_id` (integer, required): ID of the collection to delete

**Example Usage:**
```json
{
  "name": "collections_delete",
  "arguments": {
    "collection_id": 1
  }
}
```

### Tag Management Tools

#### `tags_get`
Retrieve user's tags.

**Parameters:**
- `include_counts` (boolean, optional): Include link counts (default: true)

**Example Usage:**
```json
{
  "name": "tags_get",
  "arguments": {
    "include_counts": true
  }
}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "machine-learning",
    "color": "purple",
    "link_count": 25,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `tags_create`
Create a new tag.

**Parameters:**
- `name` (string, required): Tag name
- `color` (string, optional): Tag color

**Example Usage:**
```json
{
  "name": "tags_create",
  "arguments": {
    "name": "deep-learning",
    "color": "blue"
  }
}
```

#### `tags_update`
Update an existing tag.

**Parameters:**
- `tag_id` (integer, required): ID of the tag to update
- `name` (string, optional): New name
- `color` (string, optional): New color

**Example Usage:**
```json
{
  "name": "tags_update",
  "arguments": {
    "tag_id": 1,
    "name": "updated-tag-name",
    "color": "red"
  }
}
```

#### `tags_delete`
Delete a tag (will be removed from all links).

**Parameters:**
- `tag_id` (integer, required): ID of the tag to delete

**Example Usage:**
```json
{
  "name": "tags_delete",
  "arguments": {
    "tag_id": 1
  }
}
```

### Search Tools

#### `search_advanced`
Perform advanced search with multiple filters.

**Parameters:**
- `query` (string, required): Search query
- `operator` (string, optional): Search operator - "AND" or "OR" (default: "OR")
- `collection_ids` (array of integers, optional): Filter by collections
- `tag_ids` (array of integers, optional): Filter by tags
- `start_date` (string, optional): Start date filter (ISO format)
- `end_date` (string, optional): End date filter (ISO format)
- `limit` (integer, optional): Number of results (default: 50)
- `skip` (integer, optional): Skip for pagination (default: 0)
- `sort_by` (string, optional): Sort field (default: "relevance")
- `sort_desc` (boolean, optional): Sort in descending order (default: true)

**Example Usage:**
```json
{
  "name": "search_advanced",
  "arguments": {
    "query": "machine learning neural networks",
    "operator": "AND",
    "collection_ids": [1, 2],
    "tag_ids": [1, 3],
    "start_date": "2024-01-01T00:00:00Z",
    "limit": 20
  }
}
```

#### `search_suggestions`
Get search suggestions based on user's bookmarks.

**Parameters:**
- `query` (string, required): Partial search query
- `limit` (integer, optional): Number of suggestions (default: 10)

**Example Usage:**
```json
{
  "name": "search_suggestions",
  "arguments": {
    "query": "machine",
    "limit": 5
  }
}
```

**Response:**
```json
[
  "machine learning",
  "machine vision",
  "machine translation",
  "machine ethics",
  "machine intelligence"
]
```

### Analytics Tools

#### `analytics_user_stats`
Get user statistics and insights.

**Parameters:**
- `period` (string, optional): Time period - "day", "week", "month", "year" (default: "month")

**Example Usage:**
```json
{
  "name": "analytics_user_stats",
  "arguments": {
    "period": "month"
  }
}
```

**Response:**
```json
{
  "total_links": 150,
  "total_collections": 8,
  "total_tags": 25,
  "favorite_links": 12,
  "archived_links": 5,
  "links_added_this_period": 15,
  "most_used_collections": [
    {
      "id": 1,
      "name": "Development",
      "link_count": 45
    }
  ],
  "most_used_tags": [
    {
      "id": 1,
      "name": "python",
      "link_count": 30
    }
  ]
}
```

#### `analytics_link_insights`
Get insights about a specific link.

**Parameters:**
- `link_id` (string, required): ID of the link

**Example Usage:**
```json
{
  "name": "analytics_link_insights",
  "arguments": {
    "link_id": "uuid-string"
  }
}
```

**Response:**
```json
{
  "link_id": "uuid-string",
  "title": "Example Article",
  "access_count": 5,
  "last_accessed": "2024-01-15T10:30:00Z",
  "time_spent": 300,
  "related_links": [
    {
      "id": "uuid-string-2",
      "title": "Related Article",
      "similarity_score": 0.85
    }
  ]
}
```

## Error Handling

### Error Response Format

All tools return errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: User needs to authenticate
- `INVALID_CREDENTIALS`: Username or password is incorrect
- `TOKEN_EXPIRED`: Authentication token has expired
- `PERMISSION_DENIED`: User doesn't have permission for the operation
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: LinkLibrary service is unavailable
- `INTERNAL_ERROR`: Internal server error

### Error Handling Examples

#### Authentication Error
```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Please authenticate before using this tool",
    "details": {
      "auth_url": "/auth/login"
    }
  }
}
```

#### Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "url": "Invalid URL format",
      "title": "Title cannot be empty"
    }
  }
}
```

## Rate Limiting

The MCP server implements rate limiting to prevent abuse:

- **Default Limit**: 100 requests per hour per user
- **Rate Limit Headers**: Included in responses when approaching limits
- **Graceful Degradation**: Returns rate limit errors instead of dropping requests

### Rate Limit Response
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "reset_time": "2024-01-15T11:30:00Z",
      "limit": 100,
      "remaining": 0
    }
  }
}
```

## Best Practices

### 1. Authentication
- Always authenticate before using tools
- Handle token refresh automatically
- Store credentials securely

### 2. Error Handling
- Always check for error responses
- Implement retry logic for transient errors
- Provide user-friendly error messages

### 3. Performance
- Use pagination for large result sets
- Cache frequently accessed data
- Batch operations when possible

### 4. Security
- Validate all input parameters
- Sanitize user-provided content
- Use HTTPS for all communications

### 5. User Experience
- Provide meaningful feedback for operations
- Show progress for long-running operations
- Handle offline scenarios gracefully

## Integration Examples

### Example 1: Creating a Bookmark with AI Analysis
```python
# 1. Parse text to extract links
parse_result = await mcp_client.call_tool("links_parse", {
    "text": "Check out this amazing article: https://example.com/article"
})

# 2. Create bookmark for each extracted link
for link_data in parse_result:
    await mcp_client.call_tool("links_create", {
        "url": link_data["link"],
        "title": link_data["desc"],
        "summary": link_data["summary"],
        "notes": link_data["notes"],
        "collection_id": 1,
        "tag_ids": [1, 2]
    })
```

### Example 2: Organizing Bookmarks by Topic
```python
# 1. Search for machine learning related bookmarks
search_result = await mcp_client.call_tool("search_advanced", {
    "query": "machine learning",
    "operator": "OR",
    "limit": 100
})

# 2. Create a new collection for ML bookmarks
collection = await mcp_client.call_tool("collections_create", {
    "name": "Machine Learning",
    "description": "Curated machine learning resources",
    "color": "purple"
})

# 3. Move bookmarks to the new collection
for link in search_result["items"]:
    await mcp_client.call_tool("links_update", {
        "link_id": link["id"],
        "collection_id": collection["id"]
    })
```

### Example 3: Analytics Dashboard
```python
# 1. Get user statistics
stats = await mcp_client.call_tool("analytics_user_stats", {
    "period": "month"
})

# 2. Get most used collections
collections = await mcp_client.call_tool("collections_get", {})

# 3. Generate insights report
report = {
    "total_bookmarks": stats["total_links"],
    "growth_rate": stats["links_added_this_period"],
    "top_collections": stats["most_used_collections"],
    "top_tags": stats["most_used_tags"]
}
```

## Versioning

The MCP server API follows semantic versioning:

- **Major Version**: Breaking changes to the API
- **Minor Version**: New features, backward compatible
- **Patch Version**: Bug fixes and improvements

Current version: `1.0.0`

## Support

For technical support and questions:

1. **Documentation**: Check this API documentation
2. **Issues**: Report bugs and feature requests
3. **Community**: Join the LinkLibrary community forum
4. **Email**: Contact support@linklibrary.com

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release
- Basic CRUD operations for links, collections, and tags
- Advanced search functionality
- Analytics and insights
- AI-powered link parsing
- Comprehensive error handling
- Rate limiting and security features 