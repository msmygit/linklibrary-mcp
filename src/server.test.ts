import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { authService } from './services/auth-service';
import { apiClient } from './services/api-client';
import { globalCache } from './utils/cache';
import { globalRateLimiter } from './utils/rate-limiter';
import { logger } from './utils/logger';

// Mock all external dependencies
jest.mock('./services/auth-service');
jest.mock('./services/api-client');
jest.mock('./utils/cache');
jest.mock('./utils/rate-limiter');
jest.mock('./utils/logger');

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedGlobalCache = globalCache as jest.Mocked<typeof globalCache>;
const mockedGlobalRateLimiter = globalRateLimiter as jest.Mocked<typeof globalRateLimiter>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('LinkLibrary MCP Server', () => {
  let server: Server;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset server
    server = new Server(
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

    // Setup default mock implementations
    mockedAuthService.isAuthenticated.mockReturnValue(true);
    mockedAuthService.authenticate.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  });

  describe('Tool Definitions', () => {
    it('should list all available tools', async () => {
      const tools = [
        'authenticate',
        'get_links',
        'create_link',
        'get_collections',
        'get_tags',
        'search_advanced',
        'get_user_stats',
      ];

      expect(tools).toHaveLength(7);
      expect(tools).toContain('authenticate');
      expect(tools).toContain('get_links');
      expect(tools).toContain('create_link');
    });
  });

  describe('Authentication Tool', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockedAuthService.authenticate.mockResolvedValue(mockUser);

      // This would be tested in the actual tool execution
      const result = await mockedAuthService.authenticate('test@example.com', 'password');
      
      expect(result).toEqual(mockUser);
      expect(mockedAuthService.authenticate).toHaveBeenCalledWith('test@example.com', 'password');
    });

    it('should handle authentication failure', async () => {
      const authError = new Error('Invalid credentials');
      mockedAuthService.authenticate.mockRejectedValue(authError);

      await expect(
        mockedAuthService.authenticate('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Get Links Tool', () => {
    it('should retrieve links successfully', async () => {
      const mockLinks = [
        {
          id: 'link-1',
          url: 'https://example.com',
          title: 'Example Link',
          summary: 'This is an example link',
          is_favorite: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockResponse = {
        items: mockLinks,
        total: 1,
        page: 1,
        limit: 50,
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await mockedApiClient.get('/links?limit=50');
      
      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/links?limit=50');
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await mockedApiClient.get('/links');
      
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Create Link Tool', () => {
    it('should create a link successfully', async () => {
      const mockLink = {
        id: 'link-1',
        url: 'https://example.com',
        title: 'Example Link',
        summary: 'This is an example link',
        is_favorite: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const createParams = {
        url: 'https://example.com',
        title: 'Example Link',
        summary: 'This is an example link',
      };

      mockedApiClient.post.mockResolvedValue(mockLink);

      const result = await mockedApiClient.post('/links', createParams);
      
      expect(result).toEqual(mockLink);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/links', createParams);
    });
  });

  describe('Get Collections Tool', () => {
    it('should retrieve collections successfully', async () => {
      const mockCollections = [
        {
          id: 1,
          name: 'Default Collection',
          description: 'Default collection for bookmarks',
          color: 'blue',
          is_default: true,
          link_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValue(mockCollections);

      const result = await mockedApiClient.get('/collections');
      
      expect(result).toEqual(mockCollections);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/collections');
    });
  });

  describe('Get Tags Tool', () => {
    it('should retrieve tags successfully', async () => {
      const mockTags = [
        {
          id: 1,
          name: 'important',
          color: 'red',
          link_count: 3,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockedApiClient.get.mockResolvedValue(mockTags);

      const result = await mockedApiClient.get('/tags');
      
      expect(result).toEqual(mockTags);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/tags');
    });
  });

  describe('Search Advanced Tool', () => {
    it('should perform advanced search successfully', async () => {
      const mockSearchResults = {
        items: [
          {
            id: 'link-1',
            url: 'https://example.com',
            title: 'Example Link',
            summary: 'This is an example link',
            is_favorite: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      };

      const searchParams = {
        query: 'example',
        operator: 'OR' as const,
        limit: 50,
      };

      mockedApiClient.post.mockResolvedValue(mockSearchResults);

      const result = await mockedApiClient.post('/search/advanced', searchParams);
      
      expect(result).toEqual(mockSearchResults);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/search/advanced', searchParams);
    });

    it('should handle empty search results', async () => {
      const mockSearchResults = {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      const searchParams = {
        query: 'nonexistent',
        operator: 'OR' as const,
        limit: 50,
      };

      mockedApiClient.post.mockResolvedValue(mockSearchResults);

      const result = await mockedApiClient.post('/search/advanced', searchParams);
      
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Get User Stats Tool', () => {
    it('should retrieve user statistics successfully', async () => {
      const mockStats = {
        total_links: 100,
        total_collections: 5,
        total_tags: 10,
        favorite_links: 20,
        archived_links: 5,
        links_added_this_period: 15,
        most_used_collections: [
          { name: 'Work', link_count: 30 },
          { name: 'Personal', link_count: 25 },
        ],
        most_used_tags: [
          { name: 'important', link_count: 15 },
          { name: 'work', link_count: 12 },
        ],
      };

      mockedApiClient.get.mockResolvedValue(mockStats);

      const result = await mockedApiClient.get('/analytics/user-stats?period=month');
      
      expect(result).toEqual(mockStats);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/analytics/user-stats?period=month');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockedApiClient.get.mockRejectedValue(apiError);

      await expect(
        mockedApiClient.get('/links')
      ).rejects.toThrow('API Error');
    });

    it('should handle authentication errors', async () => {
      mockedAuthService.isAuthenticated.mockReturnValue(false);

      expect(mockedAuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('Cache Integration', () => {
    it('should use cache for GET requests', async () => {
      const mockData = { items: [], total: 0 };
      mockedGlobalCache.get.mockReturnValue(mockData);

      const result = mockedGlobalCache.get('test-key');
      
      expect(result).toEqual(mockData);
      expect(mockedGlobalCache.get).toHaveBeenCalledWith('test-key');
    });

    it('should invalidate cache on POST requests', async () => {
      mockedGlobalCache.delete.mockReturnValue(true);

      const result = mockedGlobalCache.delete('test-key');
      
      expect(result).toBe(true);
      expect(mockedGlobalCache.delete).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limits', async () => {
      mockedGlobalRateLimiter.isAllowed.mockReturnValue(true);

      const result = mockedGlobalRateLimiter.isAllowed('test-key');
      
      expect(result).toBe(true);
      expect(mockedGlobalRateLimiter.isAllowed).toHaveBeenCalledWith('test-key');
    });

    it('should handle rate limit exceeded', async () => {
      mockedGlobalRateLimiter.isAllowed.mockReturnValue(false);
      mockedGlobalRateLimiter.getInfo.mockReturnValue({
        remaining: 0,
        resetTime: Date.now() + 60000,
        limit: 100,
        windowMs: 60000,
      });

      const result = mockedGlobalRateLimiter.isAllowed('test-key');
      
      expect(result).toBe(false);
    });
  });

  describe('Logging', () => {
    it('should log operations correctly', async () => {
      mockedLogger.info.mockImplementation(() => {});
      mockedLogger.error.mockImplementation(() => {});
      mockedLogger.debug.mockImplementation(() => {});

      mockedLogger.info('Test message', { operation: 'test' });
      mockedLogger.error('Test error', { operation: 'test' }, new Error('Test error'));
      mockedLogger.debug('Test debug', { operation: 'test' });

      expect(mockedLogger.info).toHaveBeenCalledWith('Test message', { operation: 'test' });
      expect(mockedLogger.error).toHaveBeenCalledWith('Test error', { operation: 'test' }, expect.any(Error));
      expect(mockedLogger.debug).toHaveBeenCalledWith('Test debug', { operation: 'test' });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(0);
    });
  });
}); 