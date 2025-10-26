import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { logger } from '@/lib/logging';

// Access to private properties for debugging (temporary)
const loggerAny = logger as any;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Check if user is admin (you can customize this logic)
 */
function isAdminUser(email: string): boolean {
  // For now, allow all @energi.team users to view logs
  // You can customize this to specific admin emails if needed
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || '@energi.team';
  return email.endsWith(allowedDomain);
}

/**
 * GET /api/logs - Get audit logs with optional filtering
 * Query parameters:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * - userEmail: filter by specific user (optional)
 * - limit: number of recent entries to return (optional)
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

    // 2. Check admin permissions
    if (!isAdminUser(session.user.email)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const userEmail = searchParams.get('userEmail') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // 4. Get logs based on parameters
    let logs;
    if (limit && !startDate && !endDate) {
      // Get recent activity from cache
      logs = logger.getRecentActivity(limit);
    } else {
      // Get logs from files with date range
      logs = await logger.getAuditLogs(startDate, endDate, userEmail);

      // Apply limit if specified
      if (limit) {
        logs = logs.slice(-limit).reverse(); // Most recent first
      }
    }

    console.log(`Logs API: Returning ${logs.length} logs for user ${session.user.email}`, {
      limit,
      startDate,
      endDate,
      userEmail,
      cacheSize: loggerAny.inMemoryCache?.length || 0,
      isProduction: loggerAny.isProduction
    });

    return NextResponse.json({
      success: true,
      data: logs,
      metadata: {
        count: logs.length,
        filters: {
          startDate,
          endDate,
          userEmail,
          limit,
        },
        requestedBy: session.user.email,
        timestamp: new Date().toISOString(),
        debug: {
          cacheSize: loggerAny.inMemoryCache?.length || 0,
          isProduction: loggerAny.isProduction
        }
      }
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
