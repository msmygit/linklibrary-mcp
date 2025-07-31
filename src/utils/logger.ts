import { logConfig } from "../config";

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  duration?: number;
  requestId?: string;
}

// Performance metrics
export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: string;
}

// Metrics collector
class MetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the latest metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageResponseTime(operation?: string): number {
    const relevantMetrics = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / relevantMetrics.length;
  }

  getSuccessRate(operation?: string): number {
    const relevantMetrics = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const successful = relevantMetrics.filter((m) => m.success).length;
    return successful / relevantMetrics.length;
  }

  getRequestCount(operation?: string): number {
    const relevantMetrics = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;

    return relevantMetrics.length;
  }

  clear(): void {
    this.metrics = [];
  }
}

// Global metrics instance
export const metricsCollector = new MetricsCollector();

// Logger class
class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = this.parseLogLevel(logConfig.level);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case "error":
        return LogLevel.ERROR;
      case "warn":
        return LogLevel.WARN;
      case "info":
        return LogLevel.INFO;
      case "debug":
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    if (logConfig.format === "json") {
      return JSON.stringify(entry);
    }

    // Simple text format
    let log = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;

    if (entry.context) {
      log += ` | Context: ${JSON.stringify(entry.context)}`;
    }

    if (entry.duration !== undefined) {
      log += ` | Duration: ${entry.duration}ms`;
    }

    if (entry.requestId) {
      log += ` | RequestId: ${entry.requestId}`;
    }

    return log;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    duration?: number,
    requestId?: string,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context,
      error,
      duration,
      requestId,
    };

    const formattedLog = this.formatLog(entry);

    // Write to stderr for MCP compliance
    console.error(formattedLog);

    // Add to metrics if enabled
    if (logConfig.enable_metrics && duration !== undefined) {
      metricsCollector.addMetric({
        operation: context?.operation || "unknown",
        duration,
        success: level !== LogLevel.ERROR,
        timestamp: entry.timestamp,
      });
    }
  }

  error(
    message: string,
    context?: Record<string, any>,
    error?: Error,
    duration?: number,
    requestId?: string,
  ): void {
    this.log(LogLevel.ERROR, message, context, error, duration, requestId);
  }

  warn(
    message: string,
    context?: Record<string, any>,
    duration?: number,
    requestId?: string,
  ): void {
    this.log(LogLevel.WARN, message, context, undefined, duration, requestId);
  }

  info(
    message: string,
    context?: Record<string, any>,
    duration?: number,
    requestId?: string,
  ): void {
    this.log(LogLevel.INFO, message, context, undefined, duration, requestId);
  }

  debug(
    message: string,
    context?: Record<string, any>,
    duration?: number,
    requestId?: string,
  ): void {
    this.log(LogLevel.DEBUG, message, context, undefined, duration, requestId);
  }

  // Performance logging helpers
  startTimer(
    operation: string,
    context?: Record<string, any>,
    requestId?: string,
  ): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.info(
        `${operation} completed`,
        { ...context, operation },
        duration,
        requestId,
      );
    };
  }

  // Error logging with context
  logError(
    error: Error,
    context?: Record<string, any>,
    requestId?: string,
  ): void {
    this.error(error.message, context, error, undefined, requestId);
  }

  // API request logging
  logApiRequest(
    method: string,
    url: string,
    context?: Record<string, any>,
    requestId?: string,
  ): () => void {
    this.debug(`API Request: ${method} ${url}`, context, undefined, requestId);

    const startTime = Date.now();
    return (success: boolean = true, error?: Error) => {
      const duration = Date.now() - startTime;
      const level = success ? LogLevel.INFO : LogLevel.ERROR;
      const message = success
        ? `API Response: ${method} ${url}`
        : `API Error: ${method} ${url}`;

      this.log(level, message, context, error, duration, requestId);
    };
  }

  // Metrics logging
  logMetrics(): void {
    if (!logConfig.enable_metrics) return;

    const metrics = metricsCollector.getMetrics();
    const avgResponseTime = metricsCollector.getAverageResponseTime();
    const successRate = metricsCollector.getSuccessRate();
    const totalRequests = metricsCollector.getRequestCount();

    this.info("Performance Metrics", {
      total_requests: totalRequests,
      average_response_time_ms: Math.round(avgResponseTime),
      success_rate_percent: Math.round(successRate * 100),
      recent_metrics_count: metrics.length,
    });
  }
}

// Global logger instance
export const logger = new Logger();

// Request ID generator
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Performance decorator
export function logPerformance(operation: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const requestId = generateRequestId();
      const stopTimer = logger.startTimer(
        operation,
        { method: propertyName },
        requestId,
      );

      try {
        const result = await method.apply(this, args);
        stopTimer();
        return result;
      } catch (error) {
        logger.logError(error as Error, { method: propertyName }, requestId);
        throw error;
      }
    };
  };
}
