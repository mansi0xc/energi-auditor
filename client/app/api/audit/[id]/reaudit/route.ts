import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import AuditReportModel from '@/lib/models/AuditReport';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/audit/[id]/reaudit - Get all re-audits for a specific audit report
 * Returns all re-audits sorted by date (most recent first)
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

    // 4. Check if report exists and belongs to user
    // Could be original audit or a re-audit itself
    const report = await AuditReportModel.findOne({
      _id: reportId,
      userEmail,
    }).lean();

    if (!report) {
      return NextResponse.json(
        { error: 'Audit report not found' },
        { status: 404 }
      );
    }

    // 5. Determine the original audit ID
    // If this is a re-audit, get its originalAuditId
    // If this is an original audit, use its own ID
    const reportData = report as any;
    const originalAuditId = reportData.isReAudit && reportData.originalAuditId 
      ? reportData.originalAuditId.toString()
      : reportId;

    // 6. Get the original audit
    const originalAudit = await AuditReportModel.findOne({
      _id: originalAuditId,
      userEmail,
    }).lean();

    // 7. Find all re-audits for this original audit, sorted by date (most recent first)
    const reAudits = await AuditReportModel.find({
      originalAuditId: originalAuditId,
      userEmail,
      isReAudit: true,
    })
      .sort({ auditedAt: -1 }) // Most recent first
      .lean();

    // 8. Return original audit and all re-audits
    return NextResponse.json({
      success: true,
      data: {
        originalAudit: originalAudit || null,
        reAudits: reAudits || [],
        hasReAudits: reAudits.length > 0,
        totalReAudits: reAudits.length,
      },
    });
  } catch (error) {
    console.error('Error fetching re-audits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch re-audits' },
      { status: 500 }
    );
  }
}

