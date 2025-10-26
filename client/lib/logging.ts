import { promises as fs } from 'fs';
import path from 'path';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  contractName?: string;
  contractSize: number;
  creditsConsumed: number;
  success: boolean;
  errorMessage?: string;
  auditDuration?: number;
  vulnerabilitiesFound?: number;
  severityBreakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  requestId?: string;
  type?: string; // Used for distinguishing between audit_start and audit_complete
}

/**
 * Error log entry structure
 */
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  userEmail?: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  requestId?: string;
}

/**
 * Aggregated statistics for dashboard
 */
export interface AuditStatistics {
  totalAudits: number;
  totalCreditsConsumed: number;
  totalUsers: number;
  successRate: number;
  averageAuditDuration: number;
  vulnerabilityStats: {
    totalVulnerabilities: number;
    severityBreakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  userStats: Array<{
    email: string;
    auditCount: number;
    creditsConsumed: number;
    lastAudit: string;
  }>;
  dailyStats: Array<{
    date: string;
    auditCount: number;
    creditsConsumed: number;
  }>;
}

class Logger {
  private logsDir: string;
  private inMemoryCache: AuditLogEntry[] = [];
  private maxCacheSize = 1000;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    if (this.isProduction) {
      // In production (Vercel), use in-memory storage only
      // Files don't persist in serverless environment
      this.logsDir = '/tmp/logs';
    } else {
      // In development, use local file system
      this.logsDir = path.join(process.cwd(), 'logs');
      this.ensureLogsDirectory();
    }
  }

  /**
   * Ensure logs directory exists
   */
  private async ensureLogsDirectory(): Promise<void> {
    try {
      await fs.access(this.logsDir);
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true });
      await fs.mkdir(path.join(this.logsDir, 'archive'), { recursive: true });
    }
  }

  /**
   * Generate unique ID for log entries
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current date string for log file naming
   */
  private getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Get log file path for a specific date and type
   */
  private getLogFilePath(date: string, type: 'audit' | 'error'): string {
    return path.join(this.logsDir, `${type}-${date}.jsonl`);
  }

  /**
   * Append log entry to file (JSON Lines format)
   */
  private async appendToFile(filePath: string, entry: any): Promise<void> {
    try {
      await this.ensureLogsDirectory();
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(filePath, logLine, 'utf8');
    } catch (error) {
      if (this.isProduction) {
        // In production (Vercel), log to console since files don't persist
        // This helps with debugging but logs won't be visible in production
        // TODO: Implement proper logging service or database
      } else {
        // In development, fallback to console logging if file write fails
        console.error('Failed to write to log file:', error);
        console.log('Log entry:', entry);
      }
    }
  }

  /**
   * Add entry to in-memory cache for real-time stats
   */
  private addToCache(entry: AuditLogEntry): void {
    this.inMemoryCache.push(entry);
    
    // Keep cache size manageable
    if (this.inMemoryCache.length > this.maxCacheSize) {
      this.inMemoryCache = this.inMemoryCache.slice(-this.maxCacheSize);
    }
  }

  /**
   * Log audit start
   */
  async logAuditStart(
    userEmail: string,
    contractName: string | undefined,
    contractSize: number,
    requestId: string
  ): Promise<string> {
    const id = this.generateId();
    const entry: Partial<AuditLogEntry> = {
      id,
      timestamp: new Date().toISOString(),
      userEmail,
      contractName,
      contractSize,
      creditsConsumed: 0, // Will be updated on completion
      success: false, // Will be updated on completion
      requestId,
    };

    const filePath = this.getLogFilePath(this.getCurrentDateString(), 'audit');
    await this.appendToFile(filePath, { ...entry, type: 'audit_start' });

    // Also add to cache for production
    this.addToCache({ ...entry, type: 'audit_start' } as any);
    
    return id;
  }

  /**
   * Log audit completion
   */
  async logAuditComplete(
    logId: string,
    userEmail: string,
    contractName: string | undefined,
    contractSize: number,
    success: boolean,
    auditDuration: number,
    vulnerabilitiesFound?: number,
    severityBreakdown?: AuditLogEntry['severityBreakdown'],
    errorMessage?: string,
    requestId?: string
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      userEmail,
      contractName,
      contractSize,
      creditsConsumed: success ? 1 : 0, // Only consume credit on success
      success,
      auditDuration,
      vulnerabilitiesFound,
      severityBreakdown,
      errorMessage,
      requestId,
    };

    const filePath = this.getLogFilePath(this.getCurrentDateString(), 'audit');
    await this.appendToFile(filePath, { ...entry, type: 'audit_complete' });

    // Add to cache for real-time stats (include type for filtering)
    const cacheEntry = { ...entry, type: 'audit_complete' } as any;
    this.addToCache(cacheEntry);

    if (this.isProduction) {
      console.log('AUDIT_COMPLETE:', JSON.stringify(cacheEntry));
      console.log(`Cache now has ${this.inMemoryCache.length} entries`);
    }
  }

  /**
   * Log error
   */
  async logError(
    errorType: string,
    errorMessage: string,
    userEmail?: string,
    stackTrace?: string,
    requestId?: string
  ): Promise<void> {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userEmail,
      errorType,
      errorMessage,
      stackTrace,
      requestId,
    };

    const filePath = this.getLogFilePath(this.getCurrentDateString(), 'error');
    await this.appendToFile(filePath, entry);
  }

  /**
   * Read log entries from file
   */
  private async readLogFile(filePath: string): Promise<any[]> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      if (this.isProduction) {
        // In production, files don't persist between function calls
        // Return empty array - logs are only available in memory for current session
        return [];
      } else {
        // In development, file doesn't exist or can't be read
        return [];
      }
    }
  }

  /**
   * Get audit logs for a specific date range
   */
  async getAuditLogs(
    startDate?: string,
    endDate?: string,
    userEmail?: string
  ): Promise<AuditLogEntry[]> {
    const logs: AuditLogEntry[] = [];

    if (this.isProduction) {
      // In production, only return logs from current session (in-memory cache)
      // Files don't persist in serverless environment
      const cachedLogs = this.inMemoryCache
        .filter(log => log.type === 'audit_complete' || !log.type || log.success !== undefined)
        .filter(log => !userEmail || log.userEmail === userEmail);

      logs.push(...cachedLogs);
    } else {
      // In development, read from files as before
      const start = startDate || this.getCurrentDateString();
      const end = endDate || this.getCurrentDateString();

      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime() + 24 * 60 * 60 * 1000; // Include end date

      // Read logs from each day in the range
      for (let time = startTime; time <= endTime; time += 24 * 60 * 60 * 1000) {
        const dateStr = new Date(time).toISOString().split('T')[0];
        const filePath = this.getLogFilePath(dateStr, 'audit');
        const dayLogs = await this.readLogFile(filePath);

      // Filter for completed audits and optionally by user
      const completedAudits = dayLogs
        .filter(log => log.type === 'audit_complete' || !log.type || log.success !== undefined)
        .filter(log => !userEmail || log.userEmail === userEmail);

        logs.push(...completedAudits);
      }
    }

    return logs;
  }

  /**
   * Generate statistics from logs
   */
  async generateStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<AuditStatistics> {
    const logs = await this.getAuditLogs(startDate, endDate);
    
    const totalAudits = logs.length;
    const successfulAudits = logs.filter(log => log.success);
    const totalCreditsConsumed = logs.reduce((sum, log) => sum + log.creditsConsumed, 0);
    const uniqueUsers = new Set(logs.map(log => log.userEmail)).size;
    const successRate = totalAudits > 0 ? (successfulAudits.length / totalAudits) * 100 : 0;
    
    const auditDurations = successfulAudits
      .map(log => log.auditDuration)
      .filter(duration => duration !== undefined) as number[];
    const averageAuditDuration = auditDurations.length > 0 
      ? auditDurations.reduce((sum, duration) => sum + duration, 0) / auditDurations.length 
      : 0;

    // Vulnerability statistics
    const severityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
    let totalVulnerabilities = 0;
    
    successfulAudits.forEach(log => {
      if (log.severityBreakdown) {
        severityBreakdown.critical += log.severityBreakdown.critical;
        severityBreakdown.high += log.severityBreakdown.high;
        severityBreakdown.medium += log.severityBreakdown.medium;
        severityBreakdown.low += log.severityBreakdown.low;
      }
      if (log.vulnerabilitiesFound) {
        totalVulnerabilities += log.vulnerabilitiesFound;
      }
    });

    // User statistics
    const userMap = new Map<string, { auditCount: number; creditsConsumed: number; lastAudit: string }>();
    logs.forEach(log => {
      const existing = userMap.get(log.userEmail) || { auditCount: 0, creditsConsumed: 0, lastAudit: '' };
      existing.auditCount++;
      existing.creditsConsumed += log.creditsConsumed;
      if (log.timestamp > existing.lastAudit) {
        existing.lastAudit = log.timestamp;
      }
      userMap.set(log.userEmail, existing);
    });

    const userStats = Array.from(userMap.entries()).map(([email, stats]) => ({
      email,
      ...stats,
    }));

    // Daily statistics
    const dailyMap = new Map<string, { auditCount: number; creditsConsumed: number }>();
    logs.forEach(log => {
      const date = log.timestamp.split('T')[0];
      const existing = dailyMap.get(date) || { auditCount: 0, creditsConsumed: 0 };
      existing.auditCount++;
      existing.creditsConsumed += log.creditsConsumed;
      dailyMap.set(date, existing);
    });

    const dailyStats = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    return {
      totalAudits,
      totalCreditsConsumed,
      totalUsers: uniqueUsers,
      successRate,
      averageAuditDuration,
      vulnerabilityStats: {
        totalVulnerabilities,
        severityBreakdown,
      },
      userStats,
      dailyStats,
    };
  }

  /**
   * Get recent audit activity (from cache)
   */
  getRecentActivity(limit: number = 50): AuditLogEntry[] {
    // Filter for completed audits only
    const completedAudits = this.inMemoryCache
      .filter(log => log.type === 'audit_complete' || !log.type || log.success !== undefined)
      .slice(-limit)
      .reverse(); // Most recent first

    console.log(`getRecentActivity: Found ${completedAudits.length} completed audits from ${this.inMemoryCache.length} total cached entries`);
    return completedAudits;
  }

  /**
   * Clean up old log files (archive logs older than retention period)
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const fileDate = new Date(dateMatch[1]);
            if (fileDate < cutoffDate) {
              const sourcePath = path.join(this.logsDir, file);
              const archivePath = path.join(this.logsDir, 'archive', file);
              await fs.rename(sourcePath, archivePath);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Production logging is handled through in-memory cache and console logs

// Export utility functions
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
