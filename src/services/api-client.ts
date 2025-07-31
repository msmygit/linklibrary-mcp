import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { getApiBaseUrl, getTimeoutMs, getMaxRetries } from "../config";
import { logger, generateRequestId } from "../utils/logger";
import { globalCache, CacheUtils } from "../utils/cache";
import { globalRateLimiter } from "../utils/rate-limiter";
import {
  LinkLibraryError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
} from "../types";

// API client configuration
interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  shouldRetry: (error: any) => boolean;
}

// API client class
export class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;
  private retryConfig: RetryConfig;
  private currentToken: string | null = null;

  constructor() {
    this.config = {
      baseURL: getApiBaseUrl(),
      timeout: getTimeoutMs(),
      maxRetries: getMaxRetries(),
      retryDelay: 1000,
    };

    this.retryConfig = {
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      shouldRetry: this.shouldRetry.bind(this),
    };

    this.client = this.createAxiosInstance();
  }

  // Create axios instance with interceptors
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LinkLibrary-MCP-Server/1.0.0",
      },
    });

    // Request interceptor
    instance.interceptors.request.use(
      (config) => {
        const requestId = generateRequestId();
        (config as any).metadata = { requestId, startTime: Date.now() };

        // Add authentication header
        if (this.currentToken) {
          config.headers.Authorization = `Bearer ${this.currentToken}`;
        }

        logger.debug(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`,
          {
            operation: "api_request",
            method: config.method,
            url: config.url,
            requestId,
          },
        );

        return config;
      },
      (error) => {
        logger.error(
          "API Request Error",
          { operation: "api_request_error" },
          error,
        );
        return Promise.reject(error);
      },
    );

    // Response interceptor
    instance.interceptors.response.use(
      (response) => {
        const { requestId, startTime } =
          (response.config as any).metadata || {};
        const duration = Date.now() - startTime;

        logger.debug(
          `API Response: ${response.status} ${response.config.url}`,
          {
            operation: "api_response",
            status: response.status,
            duration,
            requestId,
          },
        );

        return response;
      },
      (error) => {
        const { requestId, startTime } = (error.config as any)?.metadata || {};
        const duration = startTime ? Date.now() - startTime : 0;

        logger.error(
          `API Error: ${error.response?.status || "unknown"} ${error.config?.url}`,
          {
            operation: "api_error",
            status: error.response?.status,
            duration,
            requestId,
          },
          error,
        );

        return Promise.reject(this.handleApiError(error));
      },
    );

    return instance;
  }

  // Set authentication token
  setToken(token: string): void {
    this.currentToken = token;
    logger.info("API token set", { operation: "api_token_set" });
  }

  // Clear authentication token
  clearToken(): void {
    this.currentToken = null;
    logger.info("API token cleared", { operation: "api_token_clear" });
  }

  // Make authenticated request with retry logic
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const requestId = generateRequestId();
    const stopTimer = logger.startTimer(
      "API Request",
      {
        operation: "api_request",
        method: config.method,
        url: config.url,
      },
      requestId,
    );

    try {
      // Check rate limit
      const rateLimitKey = `api:${config.method}:${config.url}`;
      if (!globalRateLimiter.isAllowed(rateLimitKey)) {
        const info = globalRateLimiter.getInfo(rateLimitKey);
        throw new RateLimitError(
          `Rate limit exceeded for ${config.method} ${config.url}. ` +
            `Limit: ${info.limit} requests per ${info.windowMs}ms.`,
        );
      }

      // Try to get from cache for GET requests
      if (config.method?.toLowerCase() === "get") {
        const cacheKey = CacheUtils.generateKey(
          "api",
          config.method,
          config.url,
          config.params,
        );
        const cachedResult = globalCache.get(cacheKey);
        if (cachedResult) {
          stopTimer();
          return cachedResult;
        }
      }

      // Make request with retry logic
      const response = await this.makeRequestWithRetry<T>(config);

      // Cache GET responses
      if (config.method?.toLowerCase() === "get" && response) {
        const cacheKey = CacheUtils.generateKey(
          "api",
          config.method,
          config.url,
          config.params,
        );
        globalCache.set(cacheKey, response, 300000); // 5 minutes cache
      }

      stopTimer();
      return response;
    } catch (error) {
      stopTimer();
      throw error;
    }
  }

  // Make request with retry logic
  private async makeRequestWithRetry<T>(
    config: AxiosRequestConfig,
    attempt: number = 1,
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.request(config);
      return response.data;
    } catch (error) {
      if (
        attempt <= this.retryConfig.maxRetries &&
        this.retryConfig.shouldRetry(error)
      ) {
        const delay = this.retryConfig.retryDelay * Math.pow(2, attempt - 1);

        logger.warn(
          `API request failed, retrying in ${delay}ms (attempt ${attempt}/${this.retryConfig.maxRetries})`,
          {
            operation: "api_retry",
            attempt,
            max_retries: this.retryConfig.maxRetries,
            delay,
          },
        );

        await this.sleep(delay);
        return this.makeRequestWithRetry<T>(config, attempt + 1);
      }

      throw error;
    }
  }

  // Determine if request should be retried
  private shouldRetry(error: any): boolean {
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return error.response?.status === 429;
    }

    // Retry on server errors (5xx) and network errors
    return error.response?.status >= 500 || !error.response;
  }

  // Sleep utility
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Handle API errors
  private handleApiError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          return new AuthenticationError(
            data?.message || "Authentication failed",
          );
        case 400:
          return new ValidationError(data?.message || "Invalid request");
        case 429:
          return new RateLimitError(data?.message || "Rate limit exceeded");
        case 500:
          return new LinkLibraryError(
            data?.message || "Internal server error",
            500,
          );
        default:
          return new LinkLibraryError(
            data?.message || `HTTP ${status} error`,
            status,
          );
      }
    }

    if (error.code === "ECONNABORTED") {
      return new LinkLibraryError("Request timeout", 408);
    }

    if (error.code === "ENOTFOUND") {
      return new LinkLibraryError("Service unavailable", 503);
    }

    return new LinkLibraryError(error.message || "Unknown error", 500);
  }

  // Convenience methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "POST", url, data });
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PUT", url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PATCH", url, data });
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get("/health");
      return true;
    } catch (error) {
      logger.error(
        "Health check failed",
        { operation: "health_check" },
        error as Error,
      );
      return false;
    }
  }

  // Get client statistics
  getStats(): {
    baseURL: string;
    timeout: number;
    maxRetries: number;
    hasToken: boolean;
  } {
    return {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      hasToken: !!this.currentToken,
    };
  }
}

// Global API client instance
export const apiClient = new ApiClient();
