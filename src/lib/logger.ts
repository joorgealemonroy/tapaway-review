/**
 * Simple logging utility that respects development/production environment.
 * All console output should go through this logger.
 */

const isDev = import.meta.env.DEV;

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogOptions {
  /** Force logging even in production */
  force?: boolean;
}

/**
 * Logger that only outputs in development mode by default.
 * Use logger.error for errors that should always be logged.
 */
export const logger = {
  /**
   * Debug-level logging - only in development
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Info-level logging - only in development
   */
  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Warning-level logging - only in development
   */
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Error-level logging - always logged (production + development)
   * Errors should always be visible for debugging critical issues.
   */
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Log with specific level and options
   */
  log: (level: LogLevel, message: string, data?: unknown, options?: LogOptions) => {
    const shouldLog = isDev || options?.force || level === "error";
    
    if (!shouldLog) return;

    const prefix = `[${level.toUpperCase()}]`;
    
    switch (level) {
      case "error":
        console.error(prefix, message, data);
        break;
      case "warn":
        console.warn(prefix, message, data);
        break;
      default:
        console.log(prefix, message, data);
    }
  },

  /**
   * Group related logs together (dev only)
   */
  group: (label: string, fn: () => void) => {
    if (isDev) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },
};

export default logger;
