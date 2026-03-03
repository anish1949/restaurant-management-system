const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logLevels = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    constructor(level = 'INFO') {
        this.level = logLevels[level] || logLevels.INFO;
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta,
            pid: process.pid
        };
        return JSON.stringify(logEntry);
    }

    writeToFile(level, message, meta) {
        const logMessage = this.formatMessage(level, message, meta) + '\n';
        const date = new Date().toISOString().split('T')[0];
        const filename = path.join(logsDir, `${date}.log`);
        
        fs.appendFile(filename, logMessage, (err) => {
            if (err) {
                console.error('Failed to write to log file:', err);
            }
        });
    }

    error(message, meta = {}) {
        if (this.level >= logLevels.ERROR) {
            console.error(`[ERROR] ${message}`, meta);
            this.writeToFile('ERROR', message, meta);
        }
    }

    warn(message, meta = {}) {
        if (this.level >= logLevels.WARN) {
            console.warn(`[WARN] ${message}`, meta);
            this.writeToFile('WARN', message, meta);
        }
    }

    info(message, meta = {}) {
        if (this.level >= logLevels.INFO) {
            console.info(`[INFO] ${message}`, meta);
            this.writeToFile('INFO', message, meta);
        }
    }

    debug(message, meta = {}) {
        if (this.level >= logLevels.DEBUG) {
            console.debug(`[DEBUG] ${message}`, meta);
            this.writeToFile('DEBUG', message, meta);
        }
    }

    // Log API requests
    logRequest(req, res, responseTime) {
        const meta = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.user?.id
        };
        
        this.info('HTTP Request', meta);
    }
}

// Create and export logger instance
const logger = new Logger(process.env.LOG_LEVEL || 'INFO');
module.exports = logger;
