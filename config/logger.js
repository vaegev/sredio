const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: 'error', // Only log errors by default
  format: logFormat,
  transports: [
    // Write all errors to error.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write performance metrics to performance.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/performance.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport only in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: 'error' // Only show errors in console
  }));
}

// Performance logging helper
logger.performance = (message, metadata) => {
  logger.info(message, { ...metadata, type: 'performance' });
};

module.exports = logger; 