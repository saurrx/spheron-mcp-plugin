/**
 * Centralized logging utility for Spheron MCP server
 * 
 * This module provides a consistent logging interface with support for
 * different log levels and formatting.
 */

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Default log level (can be overridden by environment variable)
const DEFAULT_LOG_LEVEL = LogLevel.INFO;

// Get log level from environment variable or use default
export function getLogLevel(): LogLevel {
  const envLevel = process.env.SPHERON_LOG_LEVEL;
  if (envLevel) {
    switch (envLevel.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default:
        // Try to parse as number
        const numLevel = parseInt(envLevel, 10);
        if (!isNaN(numLevel) && numLevel >= 0 && numLevel <= 3) {
          return numLevel;
        }
    }
  }
  return DEFAULT_LOG_LEVEL;
}

// Current log level
const currentLogLevel = getLogLevel();

/**
 * Format a log message with timestamp and category
 * @param category Log category (e.g., 'Setup', 'API', 'Error')
 * @param message Log message
 * @returns Formatted log message
 */
function formatLogMessage(category: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${category}] ${message}`;
}

/**
 * Log an error message
 * @param category Log category
 * @param message Log message
 * @param error Optional error object
 */
export function error(category: string, message: string, error?: unknown): void {
  if (currentLogLevel >= LogLevel.ERROR) {
    const formattedMessage = formatLogMessage(category, message);
    if (error) {
      if (error instanceof Error) {
        console.error(formattedMessage, error.message);
        if (error.stack) {
          console.error(error.stack);
        }
      } else {
        console.error(formattedMessage, error);
      }
    } else {
      console.error(formattedMessage);
    }
  }
}

/**
 * Log a warning message
 * @param category Log category
 * @param message Log message
 */
export function warn(category: string, message: string): void {
  if (currentLogLevel >= LogLevel.WARN) {
    const formattedMessage = formatLogMessage(category, message);
    console.warn(formattedMessage);
  }
}

/**
 * Log an info message
 * @param category Log category
 * @param message Log message
 */
export function info(category: string, message: string): void {
  if (currentLogLevel >= LogLevel.INFO) {
    const formattedMessage = formatLogMessage(category, message);
    console.error(formattedMessage); // Using console.error for consistency with MCP SDK
  }
}

/**
 * Log a debug message
 * @param category Log category
 * @param message Log message
 */
export function debug(category: string, message: string): void {
  if (currentLogLevel >= LogLevel.DEBUG) {
    const formattedMessage = formatLogMessage(category, message);
    console.error(formattedMessage); // Using console.error for consistency with MCP SDK
  }
}

// Export default object for convenience
export default {
  error,
  warn,
  info,
  debug,
  LogLevel
};
