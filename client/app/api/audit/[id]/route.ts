import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import AuditReport from '@/lib/models/AuditReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/audit/[id] - Get a specific audit report by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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
    const resolvedParams = await Promise.resolve(params);
    const reportId = resolvedParams.id;

    // 2. Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID format' },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await connectDB();

    // 4. Fetch audit report
    const report = await AuditReport.findOne({
      _id: reportId,
      userEmail, // Ensure user can only access their own reports
    }).lean();

    if (!report) {
      return NextResponse.json(
        { error: 'Audit report not found' },
        { status: 404 }
      );
    }

    // 5. Return report
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error fetching audit report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit report' },
      { status: 500 }
    );
  }
}

