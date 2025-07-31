#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Import configuration and validation
import { 
  validateConfig, 
  validateEnvironment, 
  getConfigSummary 
} from './config';

// Import utilities
import { 
  logger, 
  generateRequestId, 
  metricsCollector 
} from './utils/logger';
import { globalCache } from './utils/cache';
import { globalRateLimiter } from './utils/rate-limiter';

// Import services
import { authService } from './services/auth-service';
import { apiClient } from './services/api-client';

// Import types
import {
  LinkLibraryLink,
  LinkLibraryCollection,
  LinkLibraryTag,
  LinkLibrarySearchResult,
  LinkLibraryUserStats,
  GetLinksParams,
  CreateLinkParams,
  GetCollectionsParams,
  GetTagsParams,
  SearchAdvancedParams,
  GetUserStatsParams,
} from './types';

// Create MCP server
const server = new Server(
  {
    name: 'linklibrary-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to ensure authentication
async function ensureAuthenticated(): Promise<void> {
  if (!authService.isAuthenticated()) {
    throw new Error('Authentication required. Please authenticate first.');
  }
}

// Helper function to format links for display
function formatLinks(links: LinkLibraryLink[]): string {
  if (links.length === 0) {
    return 'No links found.';
  }

  let result = `Found ${links.length} links:\n\n`;
  
  for (const link of links) {
    result += `📌 ${link.title}\n`;
    result += `🔗 ${link.url}\n`;
    if (link.summary) {
      result += `📝 ${link.summary.substring(0, 100)}${link.summary.length > 100 ? '...' : ''}\n`;
    }
    result += `⭐ ${link.is_favorite ? 'Favorite' : 'Not favorite'}\n`;
    result += `📅 ${link.created_at.substring(0, 10)}\n`;
    result += '---\n';
  }
  
  return result;
}

// Helper function to format collections for display
function formatCollections(collections: LinkLibraryCollection[]): string {
  if (collections.length === 0) {
    return 'No collections found.';
  }

  let result = `Found ${collections.length} collections:\n\n`;
  
  for (const collection of collections) {
    result += `📁 ${collection.name}\n`;
    if (collection.description) {
      result += `   📝 ${collection.description}\n`;
    }
    result += `   🔗 ${collection.link_count} links\n`;
    result += `   🎨 Color: ${collection.color || 'default'}\n`;
    result += '---\n';
  }
  
  return result;
}

// Helper function to format tags for display
function formatTags(tags: LinkLibraryTag[]): string {
  if (tags.length === 0) {
    return 'No tags found.';
  }

  let result = `Found ${tags.length} tags:\n\n`;
  
  for (const tag of tags) {
    result += `🏷️ ${tag.name}\n`;
    result += `   🎨 Color: ${tag.color || 'default'}\n`;
    result += `   🔗 ${tag.link_count} links\n`;
    result += '---\n';
  }
  
  return result;
}

// Helper function to format user stats for display
function formatUserStats(stats: LinkLibraryUserStats, period: string): string {
  let result = `📊 Your LinkLibrary Statistics (${period}):\n\n`;
  result += `📚 Total Links: ${stats.total_links}\n`;
  result += `📁 Total Collections: ${stats.total_collections}\n`;
  result += `🏷️ Total Tags: ${stats.total_tags}\n`;
  result += `⭐ Favorite Links: ${stats.favorite_links}\n`;
  result += `📦 Archived Links: ${stats.archived_links}\n`;
  result += `📈 Links Added This ${period.charAt(0).toUpperCase() + period.slice(1)}: ${stats.links_added_this_period}\n`;

  if (stats.most_used_collections && stats.most_used_collections.length > 0) {
    result += '\n🏆 Most Used Collections:\n';
    for (const collection of stats.most_used_collections.slice(0, 3)) {
      result += `   📁 ${collection.name}: ${collection.link_count} links\n`;
    }
  }

  if (stats.most_used_tags && stats.most_used_tags.length > 0) {
    result += '\n🏆 Most Used Tags:\n';
    for (const tag of stats.most_used_tags.slice(0, 3)) {
      result += `   🏷️ ${tag.name}: ${tag.link_count} links\n`;
    }
  }

  return result;
}

// Tool definitions following official MCP patterns
const tools: Tool[] = [
  {
    name: 'authenticate',
    description: 'Authenticate with LinkLibrary credentials',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Your LinkLibrary email or username',
        },
        password: {
          type: 'string',
          description: 'Your LinkLibrary password',
        },
      },
      required: ['username', 'password'],
    },
  },
  {
    name: 'get_links',
    description: 'Get links with optional filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Number of links to return (default: 50, max: 100)',
          default: 50,
        },
        skip: {
          type: 'integer',
          description: 'Number of links to skip for pagination',
          default: 0,
        },
        collection_id: {
          type: 'integer',
          description: 'Filter by collection ID',
        },
        tag_ids: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Filter by tag IDs',
        },
        search: {
          type: 'string',
          description: 'Search query for title, summary, or notes',
        },
        is_favorite: {
          type: 'boolean',
          description: 'Filter by favorite status',
        },
        sort_by: {
          type: 'string',
          description: 'Sort field',
          default: 'created_at',
        },
        sort_desc: {
          type: 'boolean',
          description: 'Sort in descending order',
          default: true,
        },
      },
    },
  },
  {
    name: 'create_link',
    description: 'Create a new bookmark with optional metadata',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to bookmark',
        },
        title: {
          type: 'string',
          description: 'Title for the bookmark',
        },
        summary: {
          type: 'string',
          description: 'Summary/description',
        },
        notes: {
          type: 'string',
          description: 'Additional notes',
        },
        collection_id: {
          type: 'integer',
          description: 'Collection to add to',
        },
        tag_ids: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Tags to apply',
        },
        is_favorite: {
          type: 'boolean',
          description: 'Mark as favorite',
          default: false,
        },
      },
      required: ['url', 'title'],
    },
  },
  {
    name: 'get_collections',
    description: 'Retrieve user collections',
    inputSchema: {
      type: 'object',
      properties: {
        include_default: {
          type: 'boolean',
          description: 'Include default collections',
          default: true,
        },
      },
    },
  },
  {
    name: 'get_tags',
    description: 'Retrieve user tags',
    inputSchema: {
      type: 'object',
      properties: {
        include_counts: {
          type: 'boolean',
          description: 'Include link counts',
          default: true,
        },
      },
    },
  },
  {
    name: 'search_advanced',
    description: 'Perform advanced search with multiple filters',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        operator: {
          type: 'string',
          description: 'Search operator - "AND" or "OR"',
          default: 'OR',
        },
        collection_ids: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Filter by collections',
        },
        tag_ids: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Filter by tags',
        },
        limit: {
          type: 'integer',
          description: 'Number of results',
          default: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_user_stats',
    description: 'Get user statistics and insights',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period - "day", "week", "month", "year"',
          default: 'month',
        },
      },
    },
  },
];

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const requestId = generateRequestId();
  const stopTimer = logger.startTimer(`Tool: ${name}`, { 
    operation: 'tool_execution',
    tool_name: name,
  }, requestId);

  try {
    let result: string;

    switch (name) {
      case 'authenticate': {
        const { username, password } = args as { username: string; password: string };
        
        const user = await authService.authenticate(username, password);
        result = `✅ Authentication successful! Welcome, ${user.full_name || user.email}`;
        break;
      }

      case 'get_links': {
        await ensureAuthenticated();
        const params = args as GetLinksParams;
        
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.skip) queryParams.append('skip', params.skip.toString());
        if (params.collection_id) queryParams.append('collection_id', params.collection_id.toString());
        if (params.tag_ids) queryParams.append('tag_ids', params.tag_ids.join(','));
        if (params.search) queryParams.append('search', params.search);
        if (params.is_favorite !== undefined) queryParams.append('is_favorite', params.is_favorite.toString());
        if (params.sort_by) queryParams.append('sort_by', params.sort_by);
        if (params.sort_desc !== undefined) queryParams.append('sort_desc', params.sort_desc.toString());

        const data = await apiClient.get<LinkLibrarySearchResult>(`/links?${queryParams.toString()}`);
        result = formatLinks(data.items);
        break;
      }

      case 'create_link': {
        await ensureAuthenticated();
        const params = args as unknown as CreateLinkParams;
        
        const data = await apiClient.post<LinkLibraryLink>('/links', params);
        result = `✅ Bookmark created successfully!\n\n📌 ${data.title}\n🔗 ${data.url}\n📝 ${data.summary || 'No summary'}`;
        
        // Invalidate cache for links
        globalCache.delete('api:GET:/links');
        break;
      }

      case 'get_collections': {
        await ensureAuthenticated();
        const params = args as GetCollectionsParams;
        
        const collections = await apiClient.get<LinkLibraryCollection[]>('/collections');
        result = formatCollections(collections);
        break;
      }

      case 'get_tags': {
        await ensureAuthenticated();
        const params = args as GetTagsParams;
        
        const tags = await apiClient.get<LinkLibraryTag[]>('/tags');
        result = formatTags(tags);
        break;
      }

      case 'search_advanced': {
        await ensureAuthenticated();
        const params = args as unknown as SearchAdvancedParams;
        
        const data = await apiClient.post<LinkLibrarySearchResult>('/search/advanced', params);
        
        if (data.items.length === 0) {
          result = `No results found for query: '${params.query}'`;
        } else {
          result = `Found ${data.total} results for '${params.query}':\n\n`;
          result += formatLinks(data.items);
        }
        break;
      }

      case 'get_user_stats': {
        await ensureAuthenticated();
        const params = args as GetUserStatsParams;
        const period = params.period || 'month';
        
        const stats = await apiClient.get<LinkLibraryUserStats>(`/analytics/user-stats?period=${period}`);
        result = formatUserStats(stats, period);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    stopTimer();
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    stopTimer();
    
    logger.error(`Tool execution failed: ${name}`, {
      operation: 'tool_execution_failure',
      tool_name: name,
      request_id: requestId,
    }, error as Error);

    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  try {
    // Validate configuration and environment
    validateConfig();
    validateEnvironment();
    
    // Log startup information
    logger.info('LinkLibrary MCP Server starting', {
      operation: 'server_startup',
      config: getConfigSummary(),
    });

    // Setup token refresh if authenticated
    if (authService.isAuthenticated()) {
      authService.setupTokenRefresh();
    }

    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('LinkLibrary MCP Server started successfully', {
      operation: 'server_started',
    });

    // Log metrics periodically
    setInterval(() => {
      logger.logMetrics();
    }, 60000); // Every minute

  } catch (error) {
    logger.error('Failed to start server', {
      operation: 'server_startup_failure',
    }, error as Error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully', {
    operation: 'server_shutdown',
  });
  
  // Log final metrics
  logger.logMetrics();
  
  // Cleanup
  globalCache.destroy();
  globalRateLimiter.destroy();
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully', {
    operation: 'server_shutdown',
  });
  
  // Log final metrics
  logger.logMetrics();
  
  // Cleanup
  globalCache.destroy();
  globalRateLimiter.destroy();
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    operation: 'uncaught_exception',
  }, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    operation: 'unhandled_rejection',
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

// Start the server
main().catch((error) => {
  logger.error('Failed to start server', {
    operation: 'server_startup_failure',
  }, error);
  process.exit(1);
}); 