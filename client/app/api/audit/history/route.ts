import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import AuditReportModel from '@/lib/models/AuditReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/audit/history - Get audit history for the authenticated user
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

    // 2. Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const contractName = searchParams.get('contractName');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 3. Connect to database
    await connectDB();

    // 4. Build query - by default, show only initial audits (not re-audits)
    // Re-audits can be shown separately if needed
    const query: any = { 
      userEmail,
      $or: [
        { isReAudit: { $exists: false } },
        { isReAudit: false }
      ]
    };
    if (contractName) {
      query.contractName = { $regex: contractName, $options: 'i' };
    }
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

    // 5. Fetch audit reports
    const reports = await AuditReportModel.find(query)
      .sort({ auditedAt: -1 }) // Most recent first
      .limit(limit)
      .skip(skip)
      .lean(); // Use lean() for better performance

    // 6. Get total count for pagination
    const total = await AuditReportModel.countDocuments(query);

    // 7. Return results
    return NextResponse.json({
      success: true,
      data: reports,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + reports.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit history' },
      { status: 500 }
    );
  }
}

