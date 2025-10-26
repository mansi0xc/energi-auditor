import type { AuditLogEntry, AuditStatistics } from './logging';

/**
 * Advanced business analytics and insights
 */

export interface BusinessMetrics {
  // User Engagement
  monthlyActiveUsers: number;
  weeklyActiveUsers: number;
  dailyActiveUsers: number;
  averageAuditsPerUser: number;
  userRetentionRate: number;
  
  // Usage Patterns
  peakUsageHours: Array<{ hour: number; audits: number }>;
  peakUsageDays: Array<{ day: string; audits: number }>;
  averageSessionDuration: number;
  
  // Performance Metrics
  averageAuditDuration: number;
  successRateTrend: Array<{ date: string; rate: number }>;
  errorRateByType: Array<{ type: string; count: number; percentage: number }>;
  
  // Contract Analysis
  contractComplexityTrend: Array<{ date: string; averageSize: number }>;
  mostCommonVulnerabilities: Array<{ type: string; count: number; severity: string }>;
  vulnerabilityDiscoveryRate: number;
  
  // Business Insights
  creditConsumptionTrend: Array<{ date: string; credits: number }>;
  growthRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  userSegmentation: {
    powerUsers: number; // >20 audits/month
    regularUsers: number; // 5-20 audits/month
    lightUsers: number; // <5 audits/month
  };
}

export interface TrendAnalysis {
  period: 'daily' | 'weekly' | 'monthly';
  metric: string;
  data: Array<{
    date: string;
    value: number;
    change?: number; // Percentage change from previous period
    trend: 'up' | 'down' | 'stable';
  }>;
  insights: string[];
}

export interface UsageInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  metric?: number;
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Calculate Monthly Active Users (MAU)
 */
export function calculateMAU(logs: AuditLogEntry[]): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentLogs = logs.filter(log => 
    new Date(log.timestamp) >= thirtyDaysAgo
  );
  
  const uniqueUsers = new Set(recentLogs.map(log => log.userEmail));
  return uniqueUsers.size;
}

/**
 * Calculate Weekly Active Users (WAU)
 */
export function calculateWAU(logs: AuditLogEntry[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentLogs = logs.filter(log => 
    new Date(log.timestamp) >= sevenDaysAgo
  );
  
  const uniqueUsers = new Set(recentLogs.map(log => log.userEmail));
  return uniqueUsers.size;
}

/**
 * Calculate Daily Active Users (DAU)
 */
export function calculateDAU(logs: AuditLogEntry[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });
  
  const uniqueUsers = new Set(todayLogs.map(log => log.userEmail));
  return uniqueUsers.size;
}

/**
 * Analyze peak usage hours
 */
export function analyzePeakUsageHours(logs: AuditLogEntry[]): Array<{ hour: number; audits: number }> {
  const hourlyUsage = new Map<number, number>();
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourlyUsage.set(i, 0);
  }
  
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1);
  });
  
  return Array.from(hourlyUsage.entries())
    .map(([hour, audits]) => ({ hour, audits }))
    .sort((a, b) => b.audits - a.audits);
}

/**
 * Analyze peak usage days
 */
export function analyzePeakUsageDays(logs: AuditLogEntry[], days: number = 7): Array<{ day: string; audits: number }> {
  const dailyUsage = new Map<string, number>();
  
  logs.forEach(log => {
    const day = log.timestamp.split('T')[0];
    dailyUsage.set(day, (dailyUsage.get(day) || 0) + 1);
  });
  
  return Array.from(dailyUsage.entries())
    .map(([day, audits]) => ({ day, audits }))
    .sort((a, b) => b.audits - a.audits)
    .slice(0, days);
}

/**
 * Calculate user segmentation
 */
export function calculateUserSegmentation(logs: AuditLogEntry[]): BusinessMetrics['userSegmentation'] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentLogs = logs.filter(log => 
    new Date(log.timestamp) >= thirtyDaysAgo
  );
  
  const userAuditCounts = new Map<string, number>();
  recentLogs.forEach(log => {
    userAuditCounts.set(log.userEmail, (userAuditCounts.get(log.userEmail) || 0) + 1);
  });
  
  let powerUsers = 0;
  let regularUsers = 0;
  let lightUsers = 0;
  
  userAuditCounts.forEach(count => {
    if (count > 20) powerUsers++;
    else if (count >= 5) regularUsers++;
    else lightUsers++;
  });
  
  return { powerUsers, regularUsers, lightUsers };
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(logs: AuditLogEntry[]): BusinessMetrics['growthRate'] {
  const now = new Date();
  
  // Daily growth
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const todayAudits = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate.toDateString() === now.toDateString();
  }).length;
  
  const yesterdayAudits = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate.toDateString() === yesterday.toDateString();
  }).length;
  
  const daily = yesterdayAudits > 0 ? ((todayAudits - yesterdayAudits) / yesterdayAudits) * 100 : 0;
  
  // Weekly growth
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  
  const thisWeekAudits = logs.filter(log => 
    new Date(log.timestamp) >= thisWeekStart
  ).length;
  
  const lastWeekAudits = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= lastWeekStart && logDate < thisWeekStart;
  }).length;
  
  const weekly = lastWeekAudits > 0 ? ((thisWeekAudits - lastWeekAudits) / lastWeekAudits) * 100 : 0;
  
  // Monthly growth
  const thisMonthStart = new Date(now);
  thisMonthStart.setDate(thisMonthStart.getDate() - 30);
  const lastMonthStart = new Date(now);
  lastMonthStart.setDate(lastMonthStart.getDate() - 60);
  
  const thisMonthAudits = logs.filter(log => 
    new Date(log.timestamp) >= thisMonthStart
  ).length;
  
  const lastMonthAudits = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= lastMonthStart && logDate < thisMonthStart;
  }).length;
  
  const monthly = lastMonthAudits > 0 ? ((thisMonthAudits - lastMonthAudits) / lastMonthAudits) * 100 : 0;
  
  return { daily, weekly, monthly };
}

/**
 * Analyze contract complexity trends
 */
export function analyzeContractComplexity(logs: AuditLogEntry[], days: number = 30): Array<{ date: string; averageSize: number }> {
  const dailyComplexity = new Map<string, { totalSize: number; count: number }>();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  logs
    .filter(log => new Date(log.timestamp) >= startDate)
    .forEach(log => {
      const date = log.timestamp.split('T')[0];
      const existing = dailyComplexity.get(date) || { totalSize: 0, count: 0 };
      existing.totalSize += log.contractSize;
      existing.count++;
      dailyComplexity.set(date, existing);
    });
  
  return Array.from(dailyComplexity.entries())
    .map(([date, { totalSize, count }]) => ({
      date,
      averageSize: Math.round(totalSize / count),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate business insights
 */
export function generateBusinessInsights(
  logs: AuditLogEntry[],
  stats: AuditStatistics
): UsageInsight[] {
  const insights: UsageInsight[] = [];
  
  // Success rate insight
  if (stats.successRate > 95) {
    insights.push({
      type: 'positive',
      title: 'Excellent Success Rate',
      description: `Your audit success rate is ${stats.successRate.toFixed(1)}%, indicating reliable service performance.`,
      metric: stats.successRate,
      priority: 'low',
    });
  } else if (stats.successRate < 90) {
    insights.push({
      type: 'warning',
      title: 'Success Rate Needs Attention',
      description: `Success rate is ${stats.successRate.toFixed(1)}%. Consider investigating common failure causes.`,
      metric: stats.successRate,
      recommendation: 'Review error logs and improve input validation.',
      priority: 'high',
    });
  }
  
  // Usage growth insight
  const growthRate = calculateGrowthRate(logs);
  if (growthRate.weekly > 20) {
    insights.push({
      type: 'positive',
      title: 'Strong Growth Trend',
      description: `Weekly audit volume has grown by ${growthRate.weekly.toFixed(1)}%.`,
      metric: growthRate.weekly,
      priority: 'medium',
    });
  } else if (growthRate.weekly < -10) {
    insights.push({
      type: 'negative',
      title: 'Declining Usage',
      description: `Weekly audit volume has decreased by ${Math.abs(growthRate.weekly).toFixed(1)}%.`,
      metric: growthRate.weekly,
      recommendation: 'Investigate user feedback and potential service issues.',
      priority: 'high',
    });
  }
  
  // User engagement insight
  const mau = calculateMAU(logs);
  const wau = calculateWAU(logs);
  const engagementRatio = mau > 0 ? (wau / mau) * 100 : 0;
  
  if (engagementRatio > 60) {
    insights.push({
      type: 'positive',
      title: 'High User Engagement',
      description: `${engagementRatio.toFixed(1)}% of monthly users are active weekly, showing strong engagement.`,
      metric: engagementRatio,
      priority: 'low',
    });
  } else if (engagementRatio < 30) {
    insights.push({
      type: 'warning',
      title: 'Low User Engagement',
      description: `Only ${engagementRatio.toFixed(1)}% of monthly users are active weekly.`,
      metric: engagementRatio,
      recommendation: 'Consider user retention strategies and feature improvements.',
      priority: 'medium',
    });
  }
  
  // Vulnerability detection insight
  const totalVulns = stats.vulnerabilityStats.totalVulnerabilities;
  const avgVulnsPerAudit = stats.totalAudits > 0 ? totalVulns / stats.totalAudits : 0;
  
  if (avgVulnsPerAudit > 5) {
    insights.push({
      type: 'neutral',
      title: 'High Vulnerability Detection',
      description: `Average of ${avgVulnsPerAudit.toFixed(1)} vulnerabilities found per audit indicates thorough analysis.`,
      metric: avgVulnsPerAudit,
      priority: 'low',
    });
  }
  
  return insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Generate comprehensive business metrics
 */
export async function generateBusinessMetrics(logs: AuditLogEntry[]): Promise<BusinessMetrics> {
  const mau = calculateMAU(logs);
  const wau = calculateWAU(logs);
  const dau = calculateDAU(logs);
  
  const totalUsers = new Set(logs.map(log => log.userEmail)).size;
  const averageAuditsPerUser = totalUsers > 0 ? logs.length / totalUsers : 0;
  
  // Calculate user retention (users who audited in both last 30 days and previous 30 days)
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const last60Days = new Date();
  last60Days.setDate(last60Days.getDate() - 60);
  
  const recent30Users = new Set(
    logs.filter(log => new Date(log.timestamp) >= last30Days)
      .map(log => log.userEmail)
  );
  const previous30Users = new Set(
    logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= last60Days && logDate < last30Days;
    }).map(log => log.userEmail)
  );
  
  const retainedUsers = Array.from(recent30Users).filter(user => previous30Users.has(user));
  const userRetentionRate = previous30Users.size > 0 ? (retainedUsers.length / previous30Users.size) * 100 : 0;
  
  const peakUsageHours = analyzePeakUsageHours(logs);
  const peakUsageDays = analyzePeakUsageDays(logs);
  
  const successfulLogs = logs.filter(log => log.success && log.auditDuration);
  const averageAuditDuration = successfulLogs.length > 0
    ? successfulLogs.reduce((sum, log) => sum + (log.auditDuration || 0), 0) / successfulLogs.length
    : 0;
  
  const contractComplexityTrend = analyzeContractComplexity(logs);
  const userSegmentation = calculateUserSegmentation(logs);
  const growthRate = calculateGrowthRate(logs);
  
  // Generate credit consumption trend
  const creditConsumptionTrend = logs
    .reduce((acc, log) => {
      const date = log.timestamp.split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.credits += log.creditsConsumed;
      } else {
        acc.push({ date, credits: log.creditsConsumed });
      }
      return acc;
    }, [] as Array<{ date: string; credits: number }>)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days
  
  return {
    monthlyActiveUsers: mau,
    weeklyActiveUsers: wau,
    dailyActiveUsers: dau,
    averageAuditsPerUser,
    userRetentionRate,
    peakUsageHours,
    peakUsageDays,
    averageSessionDuration: 0, // Would need session tracking
    averageAuditDuration,
    successRateTrend: [], // Would need historical success rate data
    errorRateByType: [], // Would need error categorization
    contractComplexityTrend,
    mostCommonVulnerabilities: [], // Would need vulnerability categorization
    vulnerabilityDiscoveryRate: 0, // Would need baseline comparison
    creditConsumptionTrend,
    growthRate,
    userSegmentation,
  };
}
