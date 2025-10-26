import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * User credit usage statistics
 */
interface UserCreditStats {
  userEmail: string;
  totalAudits: number;
  totalCreditsConsumed: number;
  auditsToday: number;
  creditsToday: number;
  auditsThisWeek: number;
  creditsThisWeek: number;
  auditsThisMonth: number;
  creditsThisMonth: number;
  lastAuditDate?: string;
  averageAuditDuration: number;
  successRate: number;
  recentActivity: Array<{
    date: string;
    contractName?: string;
    creditsConsumed: number;
    success: boolean;
    vulnerabilitiesFound?: number;
  }>;
  dailyUsage: Array<{
    date: string;
    audits: number;
    credits: number;
  }>;
}

/**
 * Calculate date ranges for filtering
 */
function getDateRanges() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = weekAgo.toISOString().split('T')[0];
  
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthStart = monthAgo.toISOString().split('T')[0];

  return { today, weekStart, monthStart };
}

/**
 * Filter logs by date range
 */
function filterLogsByDateRange(logs: any[], startDate: string, endDate?: string) {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Date.now();
  
  return logs.filter(log => {
    const logDate = new Date(log.timestamp).getTime();
    return logDate >= start && logDate <= end;
  });
}

/**
 * Generate daily usage statistics
 */
function generateDailyUsage(logs: any[], days: number = 30) {
  const dailyMap = new Map<string, { audits: number; credits: number }>();
  
  // Initialize last N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap.set(dateStr, { audits: 0, credits: 0 });
  }
  
  // Populate with actual data
  logs.forEach(log => {
    const date = log.timestamp.split('T')[0];
    if (dailyMap.has(date)) {
      const existing = dailyMap.get(date)!;
      existing.audits++;
      existing.credits += log.creditsConsumed;
    }
  });
  
  return Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    ...stats,
  }));
}

/**
 * GET /api/user/credits - Get user's credit usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // 2. Validate email domain
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || '@energi.team';
    if (!userEmail.endsWith(allowedDomain)) {
      return NextResponse.json(
        { error: 'Access denied: Invalid email domain' },
        { status: 403 }
      );
    }

    // 3. Get date ranges
    const { today, weekStart, monthStart } = getDateRanges();

    // 4. Fetch user's audit logs (last 3 months for comprehensive stats)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString().split('T')[0];

    const allUserLogs = await logger.getAuditLogs(startDate, undefined, userEmail);

    // 5. Calculate statistics
    const totalAudits = allUserLogs.length;
    const totalCreditsConsumed = allUserLogs.reduce((sum, log) => sum + log.creditsConsumed, 0);
    
    const todayLogs = filterLogsByDateRange(allUserLogs, today);
    const auditsToday = todayLogs.length;
    const creditsToday = todayLogs.reduce((sum, log) => sum + log.creditsConsumed, 0);
    
    const weekLogs = filterLogsByDateRange(allUserLogs, weekStart);
    const auditsThisWeek = weekLogs.length;
    const creditsThisWeek = weekLogs.reduce((sum, log) => sum + log.creditsConsumed, 0);
    
    const monthLogs = filterLogsByDateRange(allUserLogs, monthStart);
    const auditsThisMonth = monthLogs.length;
    const creditsThisMonth = monthLogs.reduce((sum, log) => sum + log.creditsConsumed, 0);

    // 6. Calculate performance metrics
    const successfulAudits = allUserLogs.filter(log => log.success);
    const successRate = totalAudits > 0 ? (successfulAudits.length / totalAudits) * 100 : 0;
    
    const auditDurations = successfulAudits
      .map(log => log.auditDuration)
      .filter(duration => duration !== undefined) as number[];
    const averageAuditDuration = auditDurations.length > 0 
      ? auditDurations.reduce((sum, duration) => sum + duration, 0) / auditDurations.length 
      : 0;

    // 7. Get recent activity (last 10 audits)
    const recentActivity = allUserLogs
      .slice(-10)
      .reverse()
      .map(log => ({
        date: log.timestamp,
        contractName: log.contractName,
        creditsConsumed: log.creditsConsumed,
        success: log.success,
        vulnerabilitiesFound: log.vulnerabilitiesFound,
      }));

    // 8. Generate daily usage for last 30 days
    const dailyUsage = generateDailyUsage(allUserLogs, 30);

    // 9. Find last audit date
    const lastAuditDate = allUserLogs.length > 0 
      ? allUserLogs[allUserLogs.length - 1].timestamp 
      : undefined;

    // 10. Compile response
    const stats: UserCreditStats = {
      userEmail,
      totalAudits,
      totalCreditsConsumed,
      auditsToday,
      creditsToday,
      auditsThisWeek,
      creditsThisWeek,
      auditsThisMonth,
      creditsThisMonth,
      lastAuditDate,
      averageAuditDuration: Math.round(averageAuditDuration),
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
      recentActivity,
      dailyUsage,
    };

    return NextResponse.json({
      success: true,
      data: stats,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataRange: {
          startDate,
          endDate: today,
        },
      }
    });

  } catch (error) {
    console.error('Error fetching user credit stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit statistics' },
      { status: 500 }
    );
  }
}
