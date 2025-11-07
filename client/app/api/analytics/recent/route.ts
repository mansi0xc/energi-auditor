import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuditReportModel from '@/lib/models/AuditReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/analytics/recent - Get recent audit reports for all users (public)
 * Query parameters:
 * - limit: number of recent audits to return (default: 50)
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Public endpoint - no authentication required
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 4. Connect to database
    await connectDB();

    // 5. Build date query (no user filter - get all users' audits)
    const query: any = {};
    if (startDate || endDate) {
      query.auditedAt = {};
      if (startDate) {
        query.auditedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.auditedAt.$lte = end;
      }
    }

    // 6. Fetch recent audit reports for all users
    const reports = await AuditReportModel.find(query)
      .sort({ auditedAt: -1 }) // Most recent first
      .limit(limit)
      .lean(); // Use lean() for better performance

    // 7. Return results
    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching recent audits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent audits' },
      { status: 500 }
    );
  }
}

