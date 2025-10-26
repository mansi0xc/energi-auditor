import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { logger } from '@/lib/logging';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Check if user is admin (you can customize this logic)
 */
function isAdminUser(email: string): boolean {
  // For now, allow all @energi.team users to view stats
  // You can customize this to specific admin emails if needed
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || '@energi.team';
  return email.endsWith(allowedDomain);
}

/**
 * GET /api/logs/stats - Get aggregated audit statistics
 * Query parameters:
 * - startDate: YYYY-MM-DD (optional, defaults to current date)
 * - endDate: YYYY-MM-DD (optional, defaults to current date)
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

    // 4. Generate statistics
    const stats = await logger.generateStatistics(startDate, endDate);

    // 5. Add some additional metadata
    const response = {
      success: true,
      data: stats,
      metadata: {
        dateRange: {
          startDate: startDate || 'all-time',
          endDate: endDate || 'current',
        },
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.email,
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating statistics:', error);
    return NextResponse.json(
      { error: 'Failed to generate statistics' },
      { status: 500 }
    );
  }
}
