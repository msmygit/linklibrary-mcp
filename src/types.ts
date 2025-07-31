// Core types for LinkLibrary MCP Server

export interface LinkLibraryUser {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface LinkLibraryLink {
  id: string;
  url: string;
  title: string;
  summary?: string;
  notes?: string;
  is_favorite: boolean;
  collection_id?: number;
  tag_ids?: number[];
  content_type?: string;
  created_at: string;
  updated_at: string;
}

export interface LinkLibraryCollection {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default: boolean;
  link_count: number;
  created_at: string;
  updated_at: string;
}

export interface LinkLibraryTag {
  id: number;
  name: string;
  color?: string;
  link_count: number;
  created_at: string;
  updated_at: string;
}

export interface LinkLibrarySearchResult {
  items: LinkLibraryLink[];
  total: number;
  page: number;
  limit: number;
}

export interface LinkLibraryUserStats {
  total_links: number;
  total_collections: number;
  total_tags: number;
  favorite_links: number;
  archived_links: number;
  links_added_this_period: number;
  most_used_collections: Array<{
    name: string;
    link_count: number;
  }>;
  most_used_tags: Array<{
    name: string;
    link_count: number;
  }>;
}

export interface LinkLibraryAuthResponse {
  access_token: string;
  user: LinkLibraryUser;
}

export interface LinkLibraryError {
  error: string;
  message: string;
  status_code: number;
}

// MCP Tool Parameter Types
export interface AuthenticateParams {
  username?: string;
  password?: string;
}

export interface GetLinksParams {
  limit?: number;
  skip?: number;
  collection_id?: number;
  tag_ids?: number[];
  search?: string;
  is_favorite?: boolean;
  sort_by?: string;
  sort_desc?: boolean;
}

export interface CreateLinkParams {
  url: string;
  title: string;
  summary?: string;
  notes?: string;
  collection_id?: number;
  tag_ids?: number[];
  is_favorite?: boolean;
}

export interface GetCollectionsParams {
  include_default?: boolean;
}

export interface GetTagsParams {
  include_counts?: boolean;
}

export interface SearchAdvancedParams {
  query: string;
  operator?: 'AND' | 'OR';
  collection_ids?: number[];
  tag_ids?: number[];
  start_date?: string;
  end_date?: string;
  limit?: number;
  skip?: number;
  sort_by?: string;
  sort_desc?: boolean;
}

export interface GetUserStatsParams {
  period?: 'day' | 'week' | 'month' | 'year';
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

// Metrics and Performance Types
export interface PerformanceMetrics {
  request_count: number;
  error_count: number;
  average_response_time: number;
  cache_hit_rate: number;
  last_request_time: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Configuration Types
export interface ServerConfig {
  api_base_url: string;
  timeout_ms: number;
  max_retries: number;
  cache_ttl_seconds: number;
  cache_max_size: number;
  rate_limit_requests: number;
  rate_limit_window_ms: number;
}

// Error Types
export class LinkLibraryError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'LinkLibraryError';
  }
}

export class AuthenticationError extends LinkLibraryError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class ValidationError extends LinkLibraryError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class RateLimitError extends LinkLibraryError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
} 