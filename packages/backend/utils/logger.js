/**
 * Centralized Logging Utility
 * Provides structured logging with different levels and secure output
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(logColors);

// Create custom format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// File format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [
  // Console transport (development)
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: logFormat,
    silent: process.env.NODE_ENV === 'test',
  }),
];

// Add file transports for production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels: logLevels,
  format: fileFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
    })
  );
}

// Enhanced logging methods
const loggerUtils = {
  // Standard logging methods
  error: (message, meta = {}) => logger.error(message, sanitizeMeta(meta)),
  warn: (message, meta = {}) => logger.warn(message, sanitizeMeta(meta)),
  info: (message, meta = {}) => logger.info(message, sanitizeMeta(meta)),
  http: (message, meta = {}) => logger.http(message, sanitizeMeta(meta)),
  debug: (message, meta = {}) => logger.debug(message, sanitizeMeta(meta)),

  // Specialized logging methods
  request: (req, message = 'Incoming request') => {
    const requestInfo = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    };
    
    // Add user info if available
    if (req.user) {
      requestInfo.userId = req.user.id;
    }
    
    logger.http(message, requestInfo);
  },

  database: (operation, table, meta = {}) => {
    logger.info(`Database ${operation}`, {
      table,
      ...sanitizeMeta(meta),
    });
  },

  security: (event, meta = {}) => {
    logger.warn(`Security Event: ${event}`, sanitizeMeta(meta));
  },

  performance: (operation, duration, meta = {}) => {
    logger.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...sanitizeMeta(meta),
    });
  },
};

// Sanitize metadata to remove sensitive information
function sanitizeMeta(meta) {
  const sensitive = ['password', 'token', 'secret', 'key', 'auth'];
  const sanitized = { ...meta };

  Object.keys(sanitized).forEach((key) => {
    if (sensitive.some((word) => key.toLowerCase().includes(word))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Create logs directory if it doesn't exist
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

module.exports = loggerUtils; 