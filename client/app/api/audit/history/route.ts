import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import AuditReport from '@/lib/models/AuditReport';

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

    // 3. Connect to database
    await connectDB();

    // 4. Build query
    const query: any = { userEmail };
    if (contractName) {
      query.contractName = { $regex: contractName, $options: 'i' };
    }

    // 5. Fetch audit reports
    const reports = await AuditReport.find(query)
      .sort({ auditedAt: -1 }) // Most recent first
      .limit(limit)
      .skip(skip)
      .lean(); // Use lean() for better performance

    // 6. Get total count for pagination
    const total = await AuditReport.countDocuments(query);

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

