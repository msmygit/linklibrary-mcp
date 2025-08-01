import {
  LinkLibraryUser,
  LinkLibraryAuthResponse,
  AuthenticationError,
} from "../types";
import { authConfig } from "../config";
import { apiClient } from "./api-client";
import { logger } from "../utils/logger";
import { globalCache } from "../utils/cache";
import { globalRateLimiter } from "../utils/rate-limiter";

// Authentication service class
export class AuthService {
  private currentUser: LinkLibraryUser | null = null;
  private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Initialize with token from environment if available
    if (authConfig.token) {
      this.setToken(authConfig.token);
    }
  }

  // Authenticate with username and password
  async authenticate(
    username?: string,
    password?: string,
  ): Promise<LinkLibraryUser> {
    const email = username || authConfig.username;
    const pwd = password || authConfig.password;

    if (!email || !pwd) {
      throw new AuthenticationError("Username and password are required");
    }

    // Check rate limit for authentication
    const rateLimitKey = `auth:login:${email}`;
    if (!globalRateLimiter.isAllowed(rateLimitKey)) {
      const info = globalRateLimiter.getInfo(rateLimitKey);
      throw new AuthenticationError(
        `Too many login attempts. Try again in ${Math.ceil((info.resetTime - Date.now()) / 1000)} seconds.`,
      );
    }

    try {
      // Create form data for OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', pwd);

      const response = await apiClient.post<LinkLibraryAuthResponse>(
        "/auth/login",
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.setToken(response.access_token);
      this.currentUser = response.user;

      logger.info("Authentication successful", {
        operation: "auth_success",
        user_id: response.user.id,
        email: response.user.email,
      });

      return response.user;
    } catch (error) {
      logger.error(
        "Authentication failed",
        {
          operation: "auth_failure",
          email,
        },
        error as Error,
      );

      throw new AuthenticationError(
        error instanceof Error ? error.message : "Authentication failed",
      );
    }
  }

  // Set authentication token
  setToken(token: string): void {
    apiClient.setToken(token);

    // Cache the token
    globalCache.set("auth:token", token, 3600000); // 1 hour cache

    logger.info("Authentication token set", {
      operation: "auth_token_set",
    });
  }

  // Get current user
  async getCurrentUser(): Promise<LinkLibraryUser | null> {
    if (!this.currentUser) {
      return null;
    }

    // Try to get from cache first
    const cacheKey = `auth:user:${this.currentUser.id}`;
    const cachedUser = globalCache.get(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    try {
      const user = await apiClient.get<LinkLibraryUser>("/auth/me");
      this.currentUser = user;

      // Cache user data
      globalCache.set(cacheKey, user, 300000); // 5 minutes cache

      return user;
    } catch (error) {
      logger.error(
        "Failed to get current user",
        {
          operation: "get_current_user_failure",
        },
        error as Error,
      );

      // Clear invalid token
      this.clearToken();
      return null;
    }
  }

  // Validate current token
  async validateToken(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch (error) {
      logger.error(
        "Token validation failed",
        {
          operation: "token_validation_failure",
        },
        error as Error,
      );
      return false;
    }
  }

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const response =
        await apiClient.post<LinkLibraryAuthResponse>("/auth/refresh");

      this.setToken(response.access_token);
      this.currentUser = response.user;

      logger.info("Token refreshed successfully", {
        operation: "token_refresh_success",
        user_id: response.user.id,
      });

      return true;
    } catch (error) {
      logger.error(
        "Token refresh failed",
        {
          operation: "token_refresh_failure",
        },
        error as Error,
      );

      this.clearToken();
      return false;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      logger.warn("Logout API call failed", {
        operation: "logout_api_failure",
      });
    } finally {
      this.clearToken();
    }
  }

  // Clear authentication
  clearToken(): void {
    apiClient.clearToken();
    this.currentUser = null;

    // Clear cached data
    globalCache.delete("auth:token");
    if (this.currentUser) {
      const user = this.currentUser as LinkLibraryUser;
      globalCache.delete(`auth:user:${user.id}`);
    }

    // Clear refresh timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    logger.info("Authentication cleared", {
      operation: "auth_clear",
    });
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get current user (synchronous)
  getCurrentUserSync(): LinkLibraryUser | null {
    return this.currentUser;
  }

  // Get user ID
  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  // Get user email
  getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  // Get user display name
  getUserDisplayName(): string | null {
    return this.currentUser?.full_name || this.currentUser?.email || null;
  }

  // Setup automatic token refresh
  setupTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Refresh token 5 minutes before expiry (assuming 1 hour expiry)
    this.tokenRefreshTimer = setTimeout(
      async () => {
        const success = await this.refreshToken();
        if (success) {
          this.setupTokenRefresh(); // Setup next refresh
        }
      },
      55 * 60 * 1000,
    ); // 55 minutes
  }

  // Get authentication status
  getAuthStatus(): {
    isAuthenticated: boolean;
    userId: string | null;
    userEmail: string | null;
    userDisplayName: string | null;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      userId: this.getUserId(),
      userEmail: this.getUserEmail(),
      userDisplayName: this.getUserDisplayName(),
    };
  }

  // Get authentication statistics
  getStats(): {
    isAuthenticated: boolean;
    hasToken: boolean;
    userInfo: {
      id: string | null;
      email: string | null;
      displayName: string | null;
    };
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: apiClient.getStats().hasToken,
      userInfo: {
        id: this.getUserId(),
        email: this.getUserEmail(),
        displayName: this.getUserDisplayName(),
      },
    };
  }
}

// Global authentication service instance
export const authService = new AuthService();
